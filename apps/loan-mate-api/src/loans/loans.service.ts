import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AccountingService } from "../accounting/accounting.service";
import { ApprovalsService } from "../approvals/approvals.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { money, toNumber } from "../common/money";
import { nextSequence, padSeq } from "../common/sequence";
import {
  assertBranchAccess,
  assertSameCompany,
  branchWhere,
  requireCompany,
} from "../common/tenancy";
import {
  ApprovalStatus,
  ApprovalType,
  DocumentEntityType,
  InstallmentStatus,
  LoanStatus,
  UserRole,
} from "../generated/prisma/client";
import { NotificationService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { generateSchedule, round2 } from "../schedules/domain/emi";
import type {
  CreateLoanDto,
  DisburseLoanDto,
  RateChangeDto,
  RejectLoanDto,
} from "./dto/loan.dto";
import { projectedScheduleRows, scheduleRow } from "./loan-schedule";

@Injectable()
export class LoansService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvals: ApprovalsService,
    @Inject(AccountingService) private readonly accounting: AccountingService,
    @Inject(NotificationService)
    private readonly notifications: NotificationService,
  ) {}

  async createDraft(actor: AuthUser, dto: CreateLoanDto) {
    const companyId = requireCompany(actor);
    assertBranchAccess(actor, dto.branchId);

    const [customer, product, branch, company] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: dto.customerId } }),
      this.prisma.loanProduct.findUnique({ where: { id: dto.productId } }),
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        include: { settings: true },
      }),
    ]);

    if (!customer || customer.companyId !== companyId) {
      throw new NotFoundException("Customer not found");
    }
    if (customer.blacklisted) {
      throw new BadRequestException("Customer is blacklisted");
    }
    if (customer.npa) {
      throw new BadRequestException("Customer is NPA; new loans not allowed");
    }
    if (!product || product.companyId !== companyId || !product.active) {
      throw new NotFoundException("Product not found");
    }
    if (!branch || branch.companyId !== companyId) {
      throw new NotFoundException("Branch not found");
    }
    if (!company) throw new NotFoundException("Company not found");

    const principal = dto.principal ?? toNumber(product.defaultPrincipal);
    const tenureInstallments = dto.tenureInstallments ?? product.defaultTenure;
    const frequency = dto.frequency ?? product.defaultFrequency;
    const productRateForFrequency = rateForFrequency(product, frequency);
    const annualRatePercent = dto.annualRatePercent ?? productRateForFrequency;
    const monthlyFirstEmiOption =
      dto.monthlyFirstEmiOption ??
      product.defaultMonthlyFirstEmi ??
      company.settings?.defaultMonthlyFirstEmiOption ??
      "EXACT_DAY";

    const feePercent = toNumber(product.processingFeePercent);
    const processingFee =
      dto.processingFee ?? money(roundFee(principal, feePercent));

    const rateOverride =
      dto.annualRatePercent !== undefined &&
      dto.annualRatePercent !== productRateForFrequency;
    const tenureOverride =
      dto.tenureInstallments !== undefined &&
      dto.tenureInstallments !== product.defaultTenure;
    const productOverride =
      rateOverride ||
      tenureOverride ||
      (dto.principal !== undefined &&
        dto.principal !== toNumber(product.defaultPrincipal));

    const seq = await nextSequence(this.prisma, `LN:${companyId}`);
    const loanNumber = `LN-${company.slug}-${padSeq(seq)}`;

    const loan = await this.prisma.loan.create({
      data: {
        companyId,
        branchId: dto.branchId,
        customerId: dto.customerId,
        productId: dto.productId,
        loanNumber,
        status: LoanStatus.DRAFT,
        principal: money(principal),
        annualRatePercent: money(annualRatePercent),
        tenureInstallments,
        frequency,
        monthlyFirstEmiOption,
        processingFee:
          typeof processingFee === "string"
            ? processingFee
            : money(processingFee),
        rateOverride,
        tenureOverride,
        productOverride,
        penaltyDailyPercent: company.settings?.penaltyDailyPercent,
      },
    });

    await this.audit.append({
      companyId,
      actorId: actor.id,
      action: "loan.create",
      entityType: "Loan",
      entityId: loan.id,
      after: { loanNumber, status: loan.status },
    });

    if (productOverride) {
      await this.approvals.create(actor, {
        type: ApprovalType.PRODUCT_OVERRIDE,
        entityType: "Loan",
        entityId: loan.id,
        loanId: loan.id,
        payload: {
          loanNumber,
          principal,
          annualRatePercent,
          tenureInstallments,
          rateOverride,
          tenureOverride,
        },
        reason: "Product terms differ from catalog defaults",
      });
    }

    return loan;
  }

  async list(actor: AuthUser) {
    const companyId = requireCompany(actor);
    const assignmentFilter =
      actor.role === UserRole.COLLECTION_OFFICER
        ? { customer: { collectionOfficerId: actor.id } }
        : {};
    return this.prisma.loan.findMany({
      where: { companyId, ...branchWhere(actor), ...assignmentFilter },
      include: { customer: true, product: true, branch: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(actor: AuthUser, id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        branch: true,
        installments: { orderBy: { number: "asc" } },
      },
    });
    if (!loan) throw new NotFoundException("Loan not found");
    assertSameCompany(actor, loan.companyId);
    assertBranchAccess(actor, loan.branchId);
    const dpd = computeLoanDpd(loan.installments);
    return { ...loan, dpd };
  }

  async schedule(actor: AuthUser, id: string) {
    const loan = await this.get(actor, id);
    const live = loan.installments.length > 0;
    const rows = live
      ? loan.installments.map((inst) =>
          scheduleRow({
            number: inst.number,
            dueDate: inst.dueDate,
            principalDue: toNumber(inst.principalDue),
            interestDue: toNumber(inst.interestDue),
            penaltyDue: toNumber(inst.penaltyDue),
            paidPrincipal: toNumber(inst.paidPrincipal),
            paidInterest: toNumber(inst.paidInterest),
            paidPenalty: toNumber(inst.paidPenalty),
            status: inst.status,
          }),
        )
      : projectedScheduleRows(
          generateSchedule({
            principal: toNumber(loan.principal),
            annualRatePercent: toNumber(loan.annualRatePercent),
            tenureInstallments: loan.tenureInstallments,
            frequency: loan.frequency,
            disbursementDate: new Date(),
            monthlyFirstEmiOption: loan.monthlyFirstEmiOption,
            processingFee: toNumber(loan.processingFee),
          }),
        );

    const settled = rows.filter(
      (row) => row.status === "PAID" || row.status === "SKIPPED",
    ).length;
    const outstanding = rows.reduce((sum, row) => sum + row.remaining, 0);
    const next = rows.find(
      (row) => row.status !== "PAID" && row.status !== "SKIPPED",
    );

    return {
      projected: !live,
      loanId: loan.id,
      loanNumber: loan.loanNumber,
      customerName: loan.customer.name,
      customerId: loan.customerId,
      loanStatus: loan.status,
      frequency: loan.frequency,
      paidCount: settled,
      installmentCount: rows.length,
      outstanding: round2(outstanding),
      nextDueDate: next?.dueDate ?? null,
      nextEmi: next?.remaining ?? 0,
      rows,
    };
  }

  private async transition(
    actor: AuthUser,
    id: string,
    from: LoanStatus[],
    to: LoanStatus,
    action: string,
    extra?: { rejectionReason?: string },
  ) {
    const loan = await this.get(actor, id);
    if (!from.includes(loan.status)) {
      throw new BadRequestException(
        `Cannot ${action}: status is ${loan.status}`,
      );
    }
    const updated = await this.prisma.loan.update({
      where: { id },
      data: {
        status: to,
        rejectionReason: extra?.rejectionReason,
      },
    });
    await this.audit.append({
      companyId: loan.companyId,
      actorId: actor.id,
      action: `loan.${action}`,
      entityType: "Loan",
      entityId: id,
      before: { status: loan.status },
      after: { status: to },
      reason: extra?.rejectionReason,
    });
    return updated;
  }

  submit(actor: AuthUser, id: string) {
    return this.transition(
      actor,
      id,
      [LoanStatus.DRAFT],
      LoanStatus.SUBMITTED,
      "submit",
    );
  }

  async verify(actor: AuthUser, id: string) {
    const loan = await this.get(actor, id);
    const customer = loan.customer;
    if (!customer.pan?.trim()) {
      throw new BadRequestException("Customer PAN required before verify");
    }
    if (!customer.address?.trim()) {
      throw new BadRequestException("Customer address required before verify");
    }
    const kycCount = await this.prisma.document.count({
      where: {
        companyId: loan.companyId,
        entityType: DocumentEntityType.CUSTOMER,
        entityId: customer.id,
      },
    });
    if (kycCount === 0) {
      throw new BadRequestException(
        "At least one KYC document required before verify",
      );
    }
    return this.transition(
      actor,
      id,
      [LoanStatus.SUBMITTED],
      LoanStatus.VERIFIED,
      "verify",
    );
  }

  async requestApproval(actor: AuthUser, id: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundException("Loan not found");
    assertSameCompany(actor, loan.companyId);
    if (loan.status !== LoanStatus.VERIFIED) {
      throw new BadRequestException(
        "Loan must be VERIFIED to request approval",
      );
    }
    if (loan.productOverride) {
      const overrideApplied = await this.prisma.approvalRequest.findFirst({
        where: {
          type: ApprovalType.PRODUCT_OVERRIDE,
          entityId: id,
          status: ApprovalStatus.APPROVED,
          appliedAt: { not: null },
        },
      });
      if (!overrideApplied) {
        throw new BadRequestException(
          "Product override must be approved before loan approval",
        );
      }
    }
    return this.approvals.create(actor, {
      type: ApprovalType.LOAN_APPROVAL,
      entityType: "Loan",
      entityId: loan.id,
      loanId: loan.id,
      payload: {
        loanNumber: loan.loanNumber,
        principal: toNumber(loan.principal),
        productOverride: loan.productOverride,
      },
    });
  }

  async approve(actor: AuthUser, id: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundException("Loan not found");
    assertSameCompany(actor, loan.companyId);
    if (loan.status !== LoanStatus.VERIFIED) {
      throw new BadRequestException("Loan must be VERIFIED");
    }

    const pending = await this.prisma.approvalRequest.findFirst({
      where: {
        entityType: "Loan",
        entityId: id,
        type: ApprovalType.LOAN_APPROVAL,
        status: ApprovalStatus.PENDING,
      },
    });
    if (!pending) {
      throw new BadRequestException("Pending loan approval request required");
    }
    return this.approvals.approve(actor, pending.id);
  }

  /** Called by ApprovalApplicator after LOAN_APPROVAL is approved. */
  async applyLoanApproval(actor: AuthUser, loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");
    assertSameCompany(actor, loan.companyId);
    if (loan.productOverride) {
      const overrideApplied = await this.prisma.approvalRequest.findFirst({
        where: {
          type: ApprovalType.PRODUCT_OVERRIDE,
          entityId: loanId,
          status: ApprovalStatus.APPROVED,
          appliedAt: { not: null },
        },
      });
      if (!overrideApplied) {
        throw new BadRequestException("Product override not applied");
      }
    }
    return this.transition(
      actor,
      loanId,
      [LoanStatus.VERIFIED],
      LoanStatus.APPROVED,
      "approve",
    );
  }

  reject(actor: AuthUser, id: string, dto: RejectLoanDto) {
    return this.transition(
      actor,
      id,
      [LoanStatus.SUBMITTED, LoanStatus.VERIFIED],
      LoanStatus.REJECTED,
      "reject",
      { rejectionReason: dto.reason },
    );
  }

  async disburse(actor: AuthUser, id: string, dto: DisburseLoanDto) {
    const loan = await this.get(actor, id);
    if (loan.status !== LoanStatus.APPROVED) {
      throw new BadRequestException("Loan must be APPROVED to disburse");
    }

    const disbursementDate = new Date(dto.disbursementDate);
    const result = generateSchedule({
      principal: toNumber(loan.principal),
      annualRatePercent: toNumber(loan.annualRatePercent),
      tenureInstallments: loan.tenureInstallments,
      frequency: loan.frequency,
      disbursementDate,
      monthlyFirstEmiOption: loan.monthlyFirstEmiOption,
      processingFee: toNumber(loan.processingFee),
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.installment.createMany({
        data: result.schedule.map((row) => ({
          loanId: id,
          number: row.installmentNumber,
          dueDate: row.dueDate,
          principalDue: money(row.principalDue),
          interestDue: money(row.interestDue),
          status: InstallmentStatus.PENDING,
        })),
      });

      await tx.loan.update({
        where: { id },
        data: {
          status: LoanStatus.DISBURSED,
          disbursementDate,
          disbursementMode: dto.mode,
          disbursementReference: dto.reference,
          netDisbursement: money(result.netDisbursement),
          partialInterestDeducted: money(result.partialInterestDeducted),
        },
      });

      return tx.loan.update({
        where: { id },
        data: { status: LoanStatus.ACTIVE },
        include: { installments: { orderBy: { number: "asc" } } },
      });
    });

    await this.accounting.postDisbursement({
      companyId: loan.companyId,
      loanId: id,
      entryDate: disbursementDate,
      principal: toNumber(loan.principal),
      netDisbursement: result.netDisbursement,
      processingFee: toNumber(loan.processingFee),
      partialInterestDeducted: result.partialInterestDeducted,
      createdById: actor.id,
    });

    await this.notifications.enqueueOutbox("loan.disburse", {
      companyId: loan.companyId,
      entityType: "Loan",
      entityId: id,
      loanNumber: loan.loanNumber,
      summary: `Loan ${loan.loanNumber} disbursed`,
    });

    await this.audit.append({
      companyId: loan.companyId,
      actorId: actor.id,
      action: "loan.disburse",
      entityType: "Loan",
      entityId: id,
      after: {
        status: updated.status,
        netDisbursement: result.netDisbursement,
        emiAmount: result.emiAmount,
      },
    });

    return updated;
  }

  async requestPenaltyOverride(
    actor: AuthUser,
    id: string,
    penaltyDailyPercent: number,
    reason?: string,
  ) {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundException("Loan not found");
    assertSameCompany(actor, loan.companyId);
    return this.approvals.create(actor, {
      type: ApprovalType.PENALTY_OVERRIDE,
      entityType: "Loan",
      entityId: loan.id,
      loanId: loan.id,
      payload: {
        loanNumber: loan.loanNumber,
        penaltyDailyPercent,
        previous: loan.penaltyDailyPercent
          ? toNumber(loan.penaltyDailyPercent)
          : null,
      },
      reason,
    });
  }

  async applyPenaltyOverride(
    actor: AuthUser,
    loanId: string,
    penaltyDailyPercent: number,
  ) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");
    assertSameCompany(actor, loan.companyId);
    const updated = await this.prisma.loan.update({
      where: { id: loanId },
      data: { penaltyDailyPercent: money(penaltyDailyPercent) },
    });
    await this.audit.append({
      companyId: loan.companyId,
      actorId: actor.id,
      action: "loan.penalty_override",
      entityType: "Loan",
      entityId: loanId,
      after: { penaltyDailyPercent },
    });
    return updated;
  }

  async requestRateChange(actor: AuthUser, id: string, dto: RateChangeDto) {
    const loan = await this.get(actor, id);
    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.DISBURSED
    ) {
      throw new BadRequestException("Rate change only after disbursement");
    }
    return this.approvals.create(actor, {
      type: ApprovalType.RATE_CHANGE,
      entityType: "Loan",
      entityId: loan.id,
      loanId: loan.id,
      payload: {
        loanNumber: loan.loanNumber,
        oldRate: toNumber(loan.annualRatePercent),
        newRate: dto.annualRatePercent,
      },
      reason: dto.reason,
    });
  }

  async applyRateChangeFromApproval(
    actor: AuthUser,
    id: string,
    annualRatePercent: number,
  ) {
    return this.applyRateChange(actor, id, {
      annualRatePercent,
      reason: "Approved rate change",
    });
  }

  /**
   * Q19: regenerate remaining unpaid EMIs from next due date at the new rate.
   * Paid installments are left unchanged.
   */
  async applyRateChange(actor: AuthUser, id: string, dto: RateChangeDto) {
    const loan = await this.get(actor, id);
    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.DISBURSED
    ) {
      throw new BadRequestException("Rate change only after disbursement");
    }

    const unpaid = loan.installments.filter(
      (i) => i.status !== InstallmentStatus.PAID,
    );
    if (unpaid.length === 0) {
      throw new BadRequestException("No unpaid installments");
    }

    const outstandingPrincipal = unpaid.reduce(
      (sum, i) =>
        sum + Math.max(0, toNumber(i.principalDue) - toNumber(i.paidPrincipal)),
      0,
    );
    const nextDue = unpaid[0]!.dueDate;
    const remainingCount = unpaid.length;

    const regenerated = generateSchedule({
      principal: outstandingPrincipal,
      annualRatePercent: dto.annualRatePercent,
      tenureInstallments: remainingCount,
      frequency: loan.frequency,
      disbursementDate: new Date(
        nextDue.getFullYear(),
        nextDue.getMonth(),
        nextDue.getDate() -
          (loan.frequency === "WEEKLY"
            ? 7
            : loan.frequency === "BIWEEKLY"
              ? 14
              : 30),
      ),
      monthlyFirstEmiOption:
        loan.frequency === "MONTHLY"
          ? "CONVERT_TO_1ST_NEXT_MONTH"
          : "EXACT_DAY",
      processingFee: 0,
    });

    // Prefer keeping original due dates; overwrite principal/interest on unpaid rows
    const updated = await this.prisma.$transaction(async (tx) => {
      for (let idx = 0; idx < unpaid.length; idx++) {
        const inst = unpaid[idx]!;
        const row = regenerated.schedule[idx];
        if (!row) break;
        const alreadyPaidP = toNumber(inst.paidPrincipal);
        const alreadyPaidI = toNumber(inst.paidInterest);
        await tx.installment.update({
          where: { id: inst.id },
          data: {
            principalDue: money(Math.max(row.principalDue, alreadyPaidP)),
            interestDue: money(Math.max(row.interestDue, alreadyPaidI)),
            dueDate: inst.dueDate,
          },
        });
      }
      return tx.loan.update({
        where: { id },
        data: {
          annualRatePercent: money(dto.annualRatePercent),
          rateOverride: true,
        },
        include: { installments: { orderBy: { number: "asc" } } },
      });
    });

    await this.audit.append({
      companyId: loan.companyId,
      actorId: actor.id,
      action: "loan.rate_change",
      entityType: "Loan",
      entityId: id,
      before: { annualRatePercent: toNumber(loan.annualRatePercent) },
      after: { annualRatePercent: dto.annualRatePercent },
      reason: dto.reason,
    });

    return updated;
  }
}

function roundFee(principal: number, percent: number): number {
  return Math.round(((principal * percent) / 100) * 100) / 100;
}

function computeLoanDpd(
  installments: Array<{
    status: InstallmentStatus;
    dueDate: Date;
    principalDue: { toNumber(): number } | number;
    interestDue: { toNumber(): number } | number;
    penaltyDue: { toNumber(): number } | number;
    paidPrincipal: { toNumber(): number } | number;
    paidInterest: { toNumber(): number } | number;
    paidPenalty: { toNumber(): number } | number;
  }>,
  asOf = new Date(),
): number {
  const today = new Date(asOf);
  today.setHours(0, 0, 0, 0);
  let maxDpd = 0;
  for (const inst of installments) {
    if (
      inst.status === InstallmentStatus.PAID ||
      inst.status === InstallmentStatus.SKIPPED
    ) {
      continue;
    }
    const rem =
      Math.max(0, toNumber(inst.principalDue) - toNumber(inst.paidPrincipal)) +
      Math.max(0, toNumber(inst.interestDue) - toNumber(inst.paidInterest)) +
      Math.max(0, toNumber(inst.penaltyDue) - toNumber(inst.paidPenalty));
    if (rem <= 0) continue;
    const due = new Date(inst.dueDate);
    due.setHours(0, 0, 0, 0);
    if (today.getTime() > due.getTime()) {
      const dpd = Math.floor(
        (today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000),
      );
      maxDpd = Math.max(maxDpd, dpd);
    }
  }
  return maxDpd;
}

function rateForFrequency(
  product: {
    defaultAnnualRate: { toNumber(): number } | number | string;
    annualRateWeekly?: { toNumber(): number } | number | string | null;
    annualRateBiweekly?: { toNumber(): number } | number | string | null;
    annualRateMonthly?: { toNumber(): number } | number | string | null;
  },
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY",
): number {
  const fallback = toNumber(product.defaultAnnualRate);
  if (frequency === "WEEKLY" && product.annualRateWeekly != null) {
    return toNumber(product.annualRateWeekly);
  }
  if (frequency === "BIWEEKLY" && product.annualRateBiweekly != null) {
    return toNumber(product.annualRateBiweekly);
  }
  if (frequency === "MONTHLY" && product.annualRateMonthly != null) {
    return toNumber(product.annualRateMonthly);
  }
  return fallback;
}
