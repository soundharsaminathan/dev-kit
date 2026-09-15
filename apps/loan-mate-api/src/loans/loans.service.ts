import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ApprovalStatus,
  ApprovalType,
  InstallmentStatus,
  LoanStatus,
} from "../generated/prisma";
import type { AuthUser } from "../auth/current-user.decorator";
import { ApprovalsService } from "../approvals/approvals.service";
import { AuditService } from "../audit/audit.service";
import { money, toNumber } from "../common/money";
import { nextSequence, padSeq } from "../common/sequence";
import {
  assertBranchAccess,
  assertSameCompany,
  requireCompany,
} from "../common/tenancy";
import { PrismaService } from "../prisma/prisma.service";
import { generateSchedule } from "../schedules/domain/emi";
import {
  CreateLoanDto,
  DisburseLoanDto,
  RateChangeDto,
  RejectLoanDto,
} from "./dto/loan.dto";

@Injectable()
export class LoansService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ApprovalsService) private readonly approvals: ApprovalsService,
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
    if (!product || product.companyId !== companyId || !product.active) {
      throw new NotFoundException("Product not found");
    }
    if (!branch || branch.companyId !== companyId) {
      throw new NotFoundException("Branch not found");
    }
    if (!company) throw new NotFoundException("Company not found");

    const principal = dto.principal ?? toNumber(product.defaultPrincipal);
    const tenureInstallments =
      dto.tenureInstallments ?? product.defaultTenure;
    const frequency = dto.frequency ?? product.defaultFrequency;
    const productRateForFrequency = rateForFrequency(product, frequency);
    const annualRatePercent =
      dto.annualRatePercent ?? productRateForFrequency;
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

    return loan;
  }

  async list(actor: AuthUser) {
    const companyId = requireCompany(actor);
    return this.prisma.loan.findMany({
      where: { companyId },
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
    return loan;
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
    return this.transition(actor, id, [LoanStatus.DRAFT], LoanStatus.SUBMITTED, "submit");
  }

  verify(actor: AuthUser, id: string) {
    return this.transition(
      actor,
      id,
      [LoanStatus.SUBMITTED],
      LoanStatus.VERIFIED,
      "verify",
    );
  }

  async requestApproval(actor: AuthUser, id: string) {
    const loan = await this.get(actor, id);
    if (loan.status !== LoanStatus.VERIFIED) {
      throw new BadRequestException("Loan must be VERIFIED to request approval");
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
    const loan = await this.get(actor, id);
    if (loan.status !== LoanStatus.VERIFIED) {
      throw new BadRequestException("Loan must be VERIFIED");
    }

    // Prefer closing a pending LOAN_APPROVAL if present
    const pending = await this.prisma.approvalRequest.findFirst({
      where: {
        entityType: "Loan",
        entityId: id,
        type: ApprovalType.LOAN_APPROVAL,
        status: ApprovalStatus.PENDING,
      },
    });
    if (pending) {
      if (pending.makerId === actor.id) {
        throw new BadRequestException("Maker cannot approve own request");
      }
      await this.approvals.approve(actor, pending.id);
    }

    return this.transition(
      actor,
      id,
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

      return tx.loan.update({
        where: { id },
        data: {
          status: LoanStatus.ACTIVE,
          disbursementDate,
          netDisbursement: money(result.netDisbursement),
          partialInterestDeducted: money(result.partialInterestDeducted),
        },
        include: { installments: { orderBy: { number: "asc" } } },
      });
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

  async requestRateChange(actor: AuthUser, id: string, dto: RateChangeDto) {
    const loan = await this.get(actor, id);
    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.DISBURSED) {
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

  /**
   * Q19: regenerate remaining unpaid EMIs from next due date at the new rate.
   * Paid installments are left unchanged.
   */
  async applyRateChange(actor: AuthUser, id: string, dto: RateChangeDto) {
    const loan = await this.get(actor, id);
    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.DISBURSED) {
      throw new BadRequestException("Rate change only after disbursement");
    }

    const approved = await this.prisma.approvalRequest.findFirst({
      where: {
        type: ApprovalType.RATE_CHANGE,
        entityId: id,
        status: ApprovalStatus.APPROVED,
      },
      orderBy: { decidedAt: "desc" },
    });
    if (!approved) {
      throw new BadRequestException("Approved rate-change request required");
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
        nextDue.getDate() - (loan.frequency === "WEEKLY" ? 7 : loan.frequency === "BIWEEKLY" ? 14 : 30),
      ),
      monthlyFirstEmiOption:
        loan.frequency === "MONTHLY" ? "CONVERT_TO_1ST_NEXT_MONTH" : "EXACT_DAY",
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
