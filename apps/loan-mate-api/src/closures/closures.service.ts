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
import { assertSameCompany } from "../common/tenancy";
import {
  ApprovalType,
  ClosureType,
  InstallmentStatus,
  JournalSourceType,
  LoanStatus,
} from "../generated/prisma/client";

import { NotificationService } from "../notifications/notifications.service";

import { PrismaService } from "../prisma/prisma.service";

import { round2 } from "../schedules/domain/emi";
import { accruedInterestToDate } from "../schedules/domain/foreclosure";

@Injectable()
export class ClosuresService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,

    @Inject(AuditService) private readonly audit: AuditService,

    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvals: ApprovalsService,

    @Inject(NotificationService)
    private readonly notifications: NotificationService,

    @Inject(AccountingService) private readonly accounting: AccountingService,
  ) {}

  private async loadActiveLoan(loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },

      include: { installments: { orderBy: { number: "asc" } } },
    });

    if (!loan) throw new NotFoundException("Loan not found");

    return loan;
  }

  private outstandingTotals(
    installments: Array<{
      principalDue: { toNumber(): number } | number;

      interestDue: { toNumber(): number } | number;

      penaltyDue: { toNumber(): number } | number;

      paidPrincipal: { toNumber(): number } | number;

      paidInterest: { toNumber(): number } | number;

      paidPenalty: { toNumber(): number } | number;
    }>,
  ) {
    let principal = 0;

    let interest = 0;

    let penalty = 0;

    for (const i of installments) {
      principal += Math.max(
        0,

        toNumber(i.principalDue) - toNumber(i.paidPrincipal),
      );

      interest += Math.max(
        0,

        toNumber(i.interestDue) - toNumber(i.paidInterest),
      );

      penalty += Math.max(
        0,

        toNumber(i.penaltyDue) - toNumber(i.paidPenalty),
      );
    }

    return { principal, interest, penalty };
  }

  private daysBetween(from: Date, to: Date) {
    const a = new Date(from);

    const b = new Date(to);

    a.setHours(0, 0, 0, 0);

    b.setHours(0, 0, 0, 0);

    return Math.max(
      0,

      Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)),
    );
  }

  computeForeclosureInterest(
    loan: {
      annualRatePercent: { toNumber(): number } | number;

      disbursementDate: Date | null;
    },

    installments: Array<{
      status: InstallmentStatus;

      dueDate: Date;

      principalDue: { toNumber(): number } | number;

      paidPrincipal: { toNumber(): number } | number;

      interestDue: { toNumber(): number } | number;

      paidInterest: { toNumber(): number } | number;
      penaltyDue: { toNumber(): number } | number;
      paidPenalty: { toNumber(): number } | number;
    }>,

    asOfDate: Date,
  ) {
    const totals = this.outstandingTotals(installments);

    const rate = toNumber(loan.annualRatePercent);

    let referenceDate = loan.disbursementDate ?? asOfDate;

    const paidOrPast = installments.filter(
      (i) =>
        i.status === InstallmentStatus.PAID ||
        new Date(i.dueDate).getTime() <= asOfDate.getTime(),
    );

    if (paidOrPast.length > 0) {
      const lastDue = paidOrPast.reduce((max, i) =>
        new Date(i.dueDate).getTime() > new Date(max.dueDate).getTime()
          ? i
          : max,
      );

      referenceDate = lastDue.dueDate;
    }

    const days = this.daysBetween(referenceDate, asOfDate);

    // Q46-A: Actual/365 interest on remaining principal to asOfDate (no separate schedule-interest add-on)
    const interestAccrued = accruedInterestToDate({
      principalOutstanding: totals.principal,
      annualRatePercent: rate,
      fromDate: referenceDate,
      asOfDate,
    });
    const brokenPeriod = interestAccrued;

    return {
      ...totals,

      interestAccrued,

      brokenPeriodAccrual: brokenPeriod,

      accrualDays: days,

      referenceDate,
    };
  }

  async getForeclosureQuote(
    actor: AuthUser,
    loanId: string,
    asOfDate?: string,
  ) {
    const loan = await this.loadActiveLoan(loanId);

    assertSameCompany(actor, loan.companyId);

    const asOf = asOfDate ? new Date(asOfDate) : new Date();

    const breakdown = this.computeForeclosureInterest(
      loan,

      loan.installments,

      asOf,
    );

    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId: loan.companyId },
    });

    const chargePct = toNumber(settings?.foreclosureChargePercent ?? 0);

    const foreclosureCharge = round2((breakdown.principal * chargePct) / 100);

    const totalDue = round2(
      breakdown.principal +
        breakdown.interestAccrued +
        breakdown.penalty +
        foreclosureCharge,
    );

    return {
      loanId,

      asOfDate: asOf.toISOString().slice(0, 10),

      principalOutstanding: breakdown.principal,

      interestAccrued: breakdown.interestAccrued,

      penaltyOutstanding: breakdown.penalty,

      foreclosureCharge,

      totalDue,

      accrualDays: breakdown.accrualDays,

      referenceDate: breakdown.referenceDate.toISOString().slice(0, 10),
    };
  }

  async requestForeclosure(
    actor: AuthUser,

    loanId: string,

    payload: { asOfDate?: string; reason?: string },
  ) {
    const loan = await this.loadActiveLoan(loanId);

    assertSameCompany(actor, loan.companyId);

    const quote = await this.getForeclosureQuote(
      actor,

      loanId,

      payload.asOfDate,
    );

    return this.approvals.create(actor, {
      type: ApprovalType.FORECLOSURE,

      entityType: "Loan",

      entityId: loanId,

      loanId,

      payload: { ...quote, reason: payload.reason },

      reason: payload.reason,
    });
  }

  async requestSettlement(
    actor: AuthUser,

    loanId: string,

    payload: { settlementAmount: number; asOfDate?: string; reason?: string },
  ) {
    const loan = await this.loadActiveLoan(loanId);

    assertSameCompany(actor, loan.companyId);

    return this.approvals.create(actor, {
      type: ApprovalType.SETTLEMENT,

      entityType: "Loan",

      entityId: loanId,

      loanId,

      payload: {
        settlementAmount: payload.settlementAmount,

        asOfDate: payload.asOfDate,

        reason: payload.reason,
      },

      reason: payload.reason,
    });
  }

  async requestWriteOff(
    actor: AuthUser,

    loanId: string,

    payload: { asOfDate?: string; reason?: string },
  ) {
    const loan = await this.loadActiveLoan(loanId);

    assertSameCompany(actor, loan.companyId);

    return this.approvals.create(actor, {
      type: ApprovalType.WRITE_OFF,

      entityType: "Loan",

      entityId: loanId,

      loanId,

      payload: { asOfDate: payload.asOfDate, reason: payload.reason },

      reason: payload.reason,
    });
  }

  private async settleUnpaidInstallmentsInTx(
    tx: {
      installment: {
        findMany: typeof PrismaService.prototype.installment.findMany;

        update: typeof PrismaService.prototype.installment.update;
      };
    },

    loanId: string,
  ) {
    const unpaid = await tx.installment.findMany({
      where: {
        loanId,

        status: { notIn: [InstallmentStatus.PAID, InstallmentStatus.SKIPPED] },
      },
    });

    for (const inst of unpaid) {
      await tx.installment.update({
        where: { id: inst.id },

        data: {
          paidPrincipal: inst.principalDue,

          paidInterest: inst.interestDue,

          paidPenalty: inst.penaltyDue,

          status: InstallmentStatus.PAID,
        },
      });
    }
  }

  async applyForeclosure(
    actor: AuthUser,

    loanId: string,

    payload: Record<string, unknown>,
  ) {
    const loan = await this.loadActiveLoan(loanId);

    assertSameCompany(actor, loan.companyId);

    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.DISBURSED
    ) {
      throw new BadRequestException("Loan not active");
    }

    const asOfDate = payload.asOfDate
      ? new Date(String(payload.asOfDate))
      : new Date();

    const breakdown = this.computeForeclosureInterest(
      loan,

      loan.installments,

      asOfDate,
    );

    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId: loan.companyId },
    });

    const chargePct = toNumber(settings?.foreclosureChargePercent ?? 0);

    const foreclosureCharge = round2((breakdown.principal * chargePct) / 100);

    await this.prisma.$transaction(async (tx) => {
      await this.settleUnpaidInstallmentsInTx(tx, loanId);

      await tx.loanClosure.create({
        data: {
          loanId,

          type: ClosureType.FORECLOSED,

          asOfDate,

          principalOutstanding: money(breakdown.principal),

          interestAccrued: money(breakdown.interestAccrued),

          penaltyOutstanding: money(breakdown.penalty),

          foreclosureCharge: money(foreclosureCharge),

          reason: payload.reason ? String(payload.reason) : undefined,
        },
      });

      await tx.loan.update({
        where: { id: loanId },

        data: {
          status: LoanStatus.CLOSED,

          closureType: ClosureType.FORECLOSED,

          closedAt: asOfDate,
        },
      });
    });

    await this.accounting.postForeclosureOrSettlement({
      companyId: loan.companyId,

      loanId,

      entryDate: asOfDate,

      sourceType: JournalSourceType.FORECLOSURE,

      principal: breakdown.principal,

      interest: breakdown.interestAccrued,

      penalty: breakdown.penalty,

      foreclosureCharge,

      createdById: actor.id,
    });

    await this.notifications.enqueueOutbox("loan.close", {
      companyId: loan.companyId,

      entityType: "Loan",

      entityId: loanId,

      loanNumber: loan.loanNumber,

      summary: `Loan ${loan.loanNumber} foreclosed`,
    });

    await this.audit.append({
      companyId: loan.companyId,

      actorId: actor.id,

      action: "loan.foreclose",

      entityType: "Loan",

      entityId: loanId,
    });
  }

  async applySettlement(
    actor: AuthUser,

    loanId: string,

    payload: Record<string, unknown>,
  ) {
    const loan = await this.loadActiveLoan(loanId);

    assertSameCompany(actor, loan.companyId);

    const settlementAmount = Number(payload.settlementAmount);

    if (!Number.isFinite(settlementAmount) || settlementAmount < 0) {
      throw new BadRequestException("settlementAmount required");
    }

    const asOfDate = payload.asOfDate
      ? new Date(String(payload.asOfDate))
      : new Date();

    const totals = this.outstandingTotals(loan.installments);

    const outstanding = round2(
      totals.principal + totals.interest + totals.penalty,
    );

    const amountWrittenOff = round2(
      Math.max(0, outstanding - settlementAmount),
    );

    await this.prisma.$transaction(async (tx) => {
      await this.settleUnpaidInstallmentsInTx(tx, loanId);

      await tx.loanClosure.create({
        data: {
          loanId,

          type: ClosureType.SETTLED,

          asOfDate,

          principalOutstanding: money(totals.principal),

          interestAccrued: money(totals.interest),

          penaltyOutstanding: money(totals.penalty),

          settlementAmount: money(settlementAmount),

          amountWrittenOff: money(amountWrittenOff),

          amountCollected: money(settlementAmount),

          reason: payload.reason ? String(payload.reason) : undefined,
        },
      });

      await tx.loan.update({
        where: { id: loanId },

        data: {
          status: LoanStatus.CLOSED,

          closureType: ClosureType.SETTLED,

          closedAt: asOfDate,
        },
      });
    });

    await this.accounting.postForeclosureOrSettlement({
      companyId: loan.companyId,

      loanId,

      entryDate: asOfDate,

      sourceType: JournalSourceType.SETTLEMENT,

      principal: totals.principal,

      interest: totals.interest,

      penalty: totals.penalty,

      cashCollected: settlementAmount,

      createdById: actor.id,
    });

    await this.notifications.enqueueOutbox("loan.close", {
      companyId: loan.companyId,

      entityType: "Loan",

      entityId: loanId,

      loanNumber: loan.loanNumber,

      summary: `Loan ${loan.loanNumber} settled`,
    });

    await this.audit.append({
      companyId: loan.companyId,

      actorId: actor.id,

      action: "loan.settle",

      entityType: "Loan",

      entityId: loanId,
    });
  }

  async applyWriteOff(
    actor: AuthUser,

    loanId: string,

    payload: Record<string, unknown>,
  ) {
    const loan = await this.loadActiveLoan(loanId);

    assertSameCompany(actor, loan.companyId);

    const asOfDate = payload.asOfDate
      ? new Date(String(payload.asOfDate))
      : new Date();

    const totals = this.outstandingTotals(loan.installments);

    const writtenOff = round2(
      totals.principal + totals.interest + totals.penalty,
    );

    const writeOffNote = payload.reason ? String(payload.reason) : "WRITE_OFF";

    await this.prisma.$transaction(async (tx) => {
      await this.settleUnpaidInstallmentsInTx(tx, loanId);

      await tx.loanClosure.create({
        data: {
          loanId,

          type: ClosureType.SETTLED,

          asOfDate,

          principalOutstanding: money(totals.principal),

          interestAccrued: money(totals.interest),

          penaltyOutstanding: money(totals.penalty),

          amountWrittenOff: money(writtenOff),

          reason: writeOffNote,
        },
      });

      await tx.loan.update({
        where: { id: loanId },

        data: {
          status: LoanStatus.WRITTEN_OFF,

          writtenOffAt: asOfDate,
        },
      });
    });

    await this.accounting.postWriteOff({
      companyId: loan.companyId,

      loanId,

      entryDate: asOfDate,

      principal: totals.principal,

      interest: totals.interest,

      penalty: totals.penalty,

      createdById: actor.id,
    });

    await this.notifications.enqueueOutbox("loan.close", {
      companyId: loan.companyId,

      entityType: "Loan",

      entityId: loanId,

      loanNumber: loan.loanNumber,

      summary: `Loan ${loan.loanNumber} written off`,
    });

    await this.audit.append({
      companyId: loan.companyId,

      actorId: actor.id,

      action: "loan.write_off",

      entityType: "Loan",

      entityId: loanId,
    });
  }
}
