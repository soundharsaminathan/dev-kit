import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AdvanceTreatment,
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
import { assertSameCompany, requireCompany } from "../common/tenancy";
import { PrismaService } from "../prisma/prisma.service";
import {
  allocatePayment,
  totalOutstanding,
  type AllocatableInstallment,
} from "../schedules/domain/allocation";
import { computePenaltyDue } from "../schedules/domain/penalty";
import { round2 } from "../schedules/domain/emi";
import {
  RecordPaymentDto,
  RequestReversalDto,
  RequestWaiverDto,
} from "./dto/payment.dto";

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ApprovalsService) private readonly approvals: ApprovalsService,
  ) {}

  private toAllocatable(
    rows: Array<{
      id: string;
      dueDate: Date;
      principalDue: { toNumber(): number } | number;
      interestDue: { toNumber(): number } | number;
      penaltyDue: { toNumber(): number } | number;
      paidPrincipal: { toNumber(): number } | number;
      paidInterest: { toNumber(): number } | number;
      paidPenalty: { toNumber(): number } | number;
    }>,
  ): AllocatableInstallment[] {
    return rows.map((r) => ({
      id: r.id,
      dueDate: r.dueDate,
      principalDue: toNumber(r.principalDue),
      interestDue: toNumber(r.interestDue),
      penaltyDue: toNumber(r.penaltyDue),
      paidPrincipal: toNumber(r.paidPrincipal),
      paidInterest: toNumber(r.paidInterest),
      paidPenalty: toNumber(r.paidPenalty),
    }));
  }

  private statusAfterPay(inst: {
    principalDue: number;
    interestDue: number;
    penaltyDue: number;
    paidPrincipal: number;
    paidInterest: number;
    paidPenalty: number;
    dueDate: Date;
  }): InstallmentStatus {
    const rem =
      round2(inst.principalDue - inst.paidPrincipal) +
      round2(inst.interestDue - inst.paidInterest) +
      round2(inst.penaltyDue - inst.paidPenalty);
    if (rem <= 0) return InstallmentStatus.PAID;
    const paidAny =
      inst.paidPrincipal > 0 || inst.paidInterest > 0 || inst.paidPenalty > 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(inst.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due.getTime() < today.getTime()) return InstallmentStatus.OVERDUE;
    return paidAny ? InstallmentStatus.PARTIAL : InstallmentStatus.PENDING;
  }

  async record(actor: AuthUser, dto: RecordPaymentDto): Promise<unknown> {
    const companyId = requireCompany(actor);
    const loan = await this.prisma.loan.findUnique({
      where: { id: dto.loanId },
      include: {
        installments: { orderBy: { dueDate: "asc" } },
        company: { include: { settings: true } },
      },
    });
    if (!loan) throw new NotFoundException("Loan not found");
    assertSameCompany(actor, loan.companyId);
    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.DISBURSED
    ) {
      throw new BadRequestException("Loan is not collectible");
    }

    const paymentDate = new Date(dto.paymentDate);
    const graceDays = loan.company.settings?.graceDays ?? 0;
    const dailyPercent = toNumber(
      loan.penaltyDailyPercent ??
        loan.company.settings?.penaltyDailyPercent ??
        0.1,
    );

    // Recompute penalty as-of payment date (backdate-safe)
    for (const inst of loan.installments) {
      if (inst.status === InstallmentStatus.PAID) continue;
      const result = computePenaltyDue({
        principalDue: toNumber(inst.principalDue),
        interestDue: toNumber(inst.interestDue),
        paidPrincipal: toNumber(inst.paidPrincipal),
        paidInterest: toNumber(inst.paidInterest),
        currentPenaltyDue: toNumber(inst.penaltyDue),
        dueDate: inst.dueDate,
        asOfDate: paymentDate,
        graceDays,
        lastPenaltyDate: inst.lastPenaltyDate,
        dailyPercent,
      });
      if (result.additionalPenalty > 0) {
        await this.prisma.installment.update({
          where: { id: inst.id },
          data: {
            penaltyDue: money(result.newPenaltyDue),
            lastPenaltyDate: paymentDate,
          },
        });
        inst.penaltyDue = money(result.newPenaltyDue) as never;
        inst.lastPenaltyDate = paymentDate;
      }
    }

    const fresh = await this.prisma.installment.findMany({
      where: { loanId: loan.id },
      orderBy: { dueDate: "asc" },
    });
    const allocatable = this.toAllocatable(fresh);
    const outstanding = totalOutstanding(allocatable);

    if (dto.amount > outstanding + 0.001) {
      // Advance path only when treatment is explicitly chosen on the form
      if (!dto.advanceTreatment) {
        throw new BadRequestException(
          "Overpayment not allowed; amount exceeds outstanding",
        );
      }
      return this.recordAdvance(actor, loan.id, companyId, dto, outstanding);
    }

    const allocation = allocatePayment(dto.amount, allocatable);
    if (allocation.remaining > 0.001) {
      throw new BadRequestException("Could not allocate full payment");
    }

    const seq = await nextSequence(this.prisma, `RCPT:${companyId}`);
    const receiptNumber = `RCPT-${padSeq(seq)}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      const pay = await tx.payment.create({
        data: {
          companyId,
          loanId: loan.id,
          receiptNumber,
          amount: money(dto.amount),
          paymentDate,
          mode: dto.mode,
          reference: dto.reference,
          details: dto.details,
          recordedById: actor.id,
        },
      });

      for (const line of allocation.lines) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: pay.id,
            installmentId: line.installmentId,
            principal: money(line.principal),
            interest: money(line.interest),
            penalty: money(line.penalty),
          },
        });

        const inst = fresh.find((i) => i.id === line.installmentId)!;
        const paidPrincipal = round2(
          toNumber(inst.paidPrincipal) + line.principal,
        );
        const paidInterest = round2(
          toNumber(inst.paidInterest) + line.interest,
        );
        const paidPenalty = round2(toNumber(inst.paidPenalty) + line.penalty);
        const status = this.statusAfterPay({
          principalDue: toNumber(inst.principalDue),
          interestDue: toNumber(inst.interestDue),
          penaltyDue: toNumber(inst.penaltyDue),
          paidPrincipal,
          paidInterest,
          paidPenalty,
          dueDate: inst.dueDate,
        });

        await tx.installment.update({
          where: { id: inst.id },
          data: {
            paidPrincipal: money(paidPrincipal),
            paidInterest: money(paidInterest),
            paidPenalty: money(paidPenalty),
            status,
          },
        });
      }

      // Close loan if fully paid
      const remaining = await tx.installment.findMany({ where: { loanId: loan.id } });
      const stillOpen = remaining.some((i) => i.status !== InstallmentStatus.PAID);
      if (!stillOpen) {
        await tx.loan.update({
          where: { id: loan.id },
          data: { status: LoanStatus.CLOSED },
        });
      }

      return pay;
    });

    await this.audit.append({
      companyId,
      actorId: actor.id,
      action: "payment.record",
      entityType: "Payment",
      entityId: payment.id,
      after: { receiptNumber, amount: dto.amount, loanId: loan.id },
    });

    return this.prisma.payment.findUnique({
      where: { id: payment.id },
      include: { allocations: true },
    });
  }

  private async recordAdvance(
    actor: AuthUser,
    loanId: string,
    companyId: string,
    dto: RecordPaymentDto,
    outstanding: number,
  ): Promise<unknown> {
    const treatment = dto.advanceTreatment!;
    const excess = round2(dto.amount - outstanding);

    // First allocate up to outstanding if any
    let basePayment = null;
    if (outstanding > 0) {
      basePayment = await this.record(actor, {
        ...dto,
        amount: outstanding,
        advanceTreatment: undefined,
      });
    }

    const seq = await nextSequence(this.prisma, `RCPT:${companyId}`);
    const receiptNumber = `RCPT-${padSeq(seq)}`;
    const paymentDate = new Date(dto.paymentDate);

    if (treatment === AdvanceTreatment.PARK_AS_ADVANCE) {
      const pay = await this.prisma.$transaction(async (tx) => {
        const p = await tx.payment.create({
          data: {
            companyId,
            loanId,
            receiptNumber,
            amount: money(excess),
            paymentDate,
            mode: dto.mode,
            reference: dto.reference,
            details: dto.details,
            advanceTreatment: treatment,
            recordedById: actor.id,
          },
        });
        await tx.loan.update({
          where: { id: loanId },
          data: { advanceBalance: { increment: money(excess) } },
        });
        return p;
      });
      return { basePayment, advancePayment: pay, treatment };
    }

    if (treatment === AdvanceTreatment.REDUCE_PRINCIPAL) {
      // Apply excess to future unpaid principal (newest unpaid first reversed → oldest remaining)
      const installments = await this.prisma.installment.findMany({
        where: { loanId, status: { not: InstallmentStatus.PAID } },
        orderBy: { dueDate: "desc" },
      });
      let left = excess;
      const pay = await this.prisma.$transaction(async (tx) => {
        const p = await tx.payment.create({
          data: {
            companyId,
            loanId,
            receiptNumber,
            amount: money(excess),
            paymentDate,
            mode: dto.mode,
            advanceTreatment: treatment,
            recordedById: actor.id,
            reference: dto.reference,
            details: dto.details,
          },
        });
        for (const inst of installments) {
          if (left <= 0) break;
          const remP = round2(
            toNumber(inst.principalDue) - toNumber(inst.paidPrincipal),
          );
          if (remP <= 0) continue;
          const take = Math.min(left, remP);
          const paidPrincipal = round2(toNumber(inst.paidPrincipal) + take);
          await tx.paymentAllocation.create({
            data: {
              paymentId: p.id,
              installmentId: inst.id,
              principal: money(take),
            },
          });
          await tx.installment.update({
            where: { id: inst.id },
            data: {
              paidPrincipal: money(paidPrincipal),
              status: this.statusAfterPay({
                principalDue: toNumber(inst.principalDue),
                interestDue: toNumber(inst.interestDue),
                penaltyDue: toNumber(inst.penaltyDue),
                paidPrincipal,
                paidInterest: toNumber(inst.paidInterest),
                paidPenalty: toNumber(inst.paidPenalty),
                dueDate: inst.dueDate,
              }),
            },
          });
          left = round2(left - take);
        }
        if (left > 0.001) {
          await tx.loan.update({
            where: { id: loanId },
            data: { advanceBalance: { increment: money(left) } },
          });
        }
        return p;
      });
      return { basePayment, advancePayment: pay, treatment };
    }

    // SKIP_NEXT_EMI — park and mark next pending as skipped via advance balance covering it
    const next = await this.prisma.installment.findFirst({
      where: {
        loanId,
        status: { in: [InstallmentStatus.PENDING, InstallmentStatus.PARTIAL] },
      },
      orderBy: { dueDate: "asc" },
    });
    const pay = await this.prisma.payment.create({
      data: {
        companyId,
        loanId,
        receiptNumber,
        amount: money(excess),
        paymentDate,
        mode: dto.mode,
        advanceTreatment: treatment,
        recordedById: actor.id,
        reference: dto.reference,
        details: `Skip next EMI ${next?.number ?? ""}`,
      },
    });
    await this.prisma.loan.update({
      where: { id: loanId },
      data: { advanceBalance: { increment: money(excess) } },
    });
    return { basePayment, advancePayment: pay, treatment, nextInstallmentId: next?.id };
  }

  async requestReversal(
    actor: AuthUser,
    paymentId: string,
    dto: RequestReversalDto,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    assertSameCompany(actor, payment.companyId);
    if (payment.reversed) {
      throw new BadRequestException("Payment already reversed");
    }

    return this.approvals.create(actor, {
      type: ApprovalType.PAYMENT_REVERSAL,
      entityType: "Payment",
      entityId: paymentId,
      loanId: payment.loanId,
      payload: { paymentId, amount: toNumber(payment.amount) },
      reason: dto.reason,
    });
  }

  async executeReversal(actor: AuthUser, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { allocations: true },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    assertSameCompany(actor, payment.companyId);
    if (payment.reversed) {
      throw new BadRequestException("Already reversed");
    }

    const pending = await this.prisma.approvalRequest.findFirst({
      where: {
        type: ApprovalType.PAYMENT_REVERSAL,
        entityId: paymentId,
        status: ApprovalStatus.APPROVED,
      },
      orderBy: { decidedAt: "desc" },
    });
    if (!pending) {
      throw new BadRequestException("Approved reversal request required");
    }

    await this.prisma.$transaction(async (tx) => {
      for (const alloc of payment.allocations) {
        const inst = await tx.installment.findUnique({
          where: { id: alloc.installmentId },
        });
        if (!inst) continue;
        const paidPrincipal = round2(
          Math.max(0, toNumber(inst.paidPrincipal) - toNumber(alloc.principal)),
        );
        const paidInterest = round2(
          Math.max(0, toNumber(inst.paidInterest) - toNumber(alloc.interest)),
        );
        const paidPenalty = round2(
          Math.max(0, toNumber(inst.paidPenalty) - toNumber(alloc.penalty)),
        );
        await tx.installment.update({
          where: { id: inst.id },
          data: {
            paidPrincipal: money(paidPrincipal),
            paidInterest: money(paidInterest),
            paidPenalty: money(paidPenalty),
            status: this.statusAfterPay({
              principalDue: toNumber(inst.principalDue),
              interestDue: toNumber(inst.interestDue),
              penaltyDue: toNumber(inst.penaltyDue),
              paidPrincipal,
              paidInterest,
              paidPenalty,
              dueDate: inst.dueDate,
            }),
          },
        });
      }
      await tx.payment.update({
        where: { id: paymentId },
        data: { reversed: true, reversedAt: new Date() },
      });
      await tx.loan.update({
        where: { id: payment.loanId },
        data: { status: LoanStatus.ACTIVE },
      });
    });

    await this.audit.append({
      companyId: payment.companyId,
      actorId: actor.id,
      action: "payment.reverse",
      entityType: "Payment",
      entityId: paymentId,
    });

    return { reversed: true };
  }

  async requestWaiver(actor: AuthUser, dto: RequestWaiverDto) {
    const companyId = requireCompany(actor);
    const inst = await this.prisma.installment.findUnique({
      where: { id: dto.installmentId },
      include: { loan: true },
    });
    if (!inst) throw new NotFoundException("Installment not found");
    assertSameCompany(actor, inst.loan.companyId);

    const remPenalty = round2(
      toNumber(inst.penaltyDue) - toNumber(inst.paidPenalty),
    );
    if (dto.amount > remPenalty + 0.001) {
      throw new BadRequestException("Waiver exceeds unpaid penalty");
    }

    return this.approvals.create(actor, {
      type: ApprovalType.PENALTY_WAIVER,
      entityType: "Installment",
      entityId: inst.id,
      loanId: inst.loanId,
      payload: { installmentId: inst.id, amount: dto.amount },
      reason: dto.reason,
    });
  }

  async executeWaiver(actor: AuthUser, installmentId: string, amount: number) {
    const inst = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: { loan: true },
    });
    if (!inst) throw new NotFoundException("Installment not found");
    assertSameCompany(actor, inst.loan.companyId);

    const approved = await this.prisma.approvalRequest.findFirst({
      where: {
        type: ApprovalType.PENALTY_WAIVER,
        entityId: installmentId,
        status: ApprovalStatus.APPROVED,
      },
      orderBy: { decidedAt: "desc" },
    });
    if (!approved) {
      throw new BadRequestException("Approved waiver required");
    }

    const newPenaltyDue = round2(
      Math.max(0, toNumber(inst.penaltyDue) - amount),
    );
    const updated = await this.prisma.installment.update({
      where: { id: installmentId },
      data: { penaltyDue: money(newPenaltyDue) },
    });

    await this.audit.append({
      companyId: inst.loan.companyId,
      actorId: actor.id,
      action: "penalty.waiver",
      entityType: "Installment",
      entityId: installmentId,
      after: { penaltyDue: newPenaltyDue, waived: amount },
    });

    return updated;
  }

  async listByLoan(actor: AuthUser, loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");
    assertSameCompany(actor, loan.companyId);
    return this.prisma.payment.findMany({
      where: { loanId },
      include: { allocations: true },
      orderBy: { paymentDate: "desc" },
    });
  }
}
