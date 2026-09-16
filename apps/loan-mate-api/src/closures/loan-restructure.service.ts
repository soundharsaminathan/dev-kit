import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ApprovalsService } from "../approvals/approvals.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { money, toNumber } from "../common/money";
import { assertSameCompany } from "../common/tenancy";
import {
  ApprovalType,
  InstallmentStatus,
  LoanStatus,
} from "../generated/prisma";

import { PrismaService } from "../prisma/prisma.service";

import { generateSchedule, round2 } from "../schedules/domain/emi";

@Injectable()
export class LoanRestructureService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,

    @Inject(AuditService) private readonly audit: AuditService,

    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvals: ApprovalsService,
  ) {}

  async requestRestructure(
    actor: AuthUser,

    loanId: string,

    payload: {
      newTenure?: number;

      newRate?: number;

      newEmiAmount?: number;

      reason?: string;
    },
  ) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });

    if (!loan) throw new NotFoundException("Loan not found");

    assertSameCompany(actor, loan.companyId);

    return this.approvals.create(actor, {
      type: ApprovalType.RESTRUCTURE,

      entityType: "Loan",

      entityId: loanId,

      loanId,

      payload: {
        newTenure: payload.newTenure,

        newRate: payload.newRate,

        newEmiAmount: payload.newEmiAmount,

        reason: payload.reason,
      },

      reason: payload.reason,
    });
  }

  async applyRestructure(
    actor: AuthUser,

    loanId: string,

    payload: Record<string, unknown>,
  ) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },

      include: { installments: { orderBy: { number: "asc" } } },
    });

    if (!loan) throw new NotFoundException("Loan not found");

    assertSameCompany(actor, loan.companyId);

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException("Only ACTIVE loans can be restructured");
    }

    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId: loan.companyId },
    });

    const maxRestructures = settings?.maxRestructures ?? 3;

    if (loan.restructureCount >= maxRestructures) {
      throw new BadRequestException("Maximum restructures reached");
    }

    const newRate = Number(payload.newRate ?? toNumber(loan.annualRatePercent));

    let newTenure = Number(payload.newTenure ?? loan.tenureInstallments);

    const newEmiAmount = payload.newEmiAmount
      ? Number(payload.newEmiAmount)
      : undefined;

    if (!Number.isFinite(newRate)) {
      throw new BadRequestException("Invalid newRate");
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

    if (newEmiAmount && newEmiAmount > 0) {
      const approx = Math.ceil(outstandingPrincipal / newEmiAmount);

      newTenure = Math.max(1, approx);
    }

    if (!Number.isFinite(newTenure) || newTenure < 1) {
      throw new BadRequestException("Invalid newTenure");
    }

    const periodOffset =
      loan.frequency === "WEEKLY" ? 7 : loan.frequency === "BIWEEKLY" ? 14 : 30;

    const regenerated = generateSchedule({
      principal: outstandingPrincipal,

      annualRatePercent: newRate,

      tenureInstallments: Math.min(newTenure, unpaid.length),

      frequency: loan.frequency,

      disbursementDate: new Date(
        nextDue.getFullYear(),

        nextDue.getMonth(),

        nextDue.getDate() - periodOffset,
      ),

      monthlyFirstEmiOption:
        loan.frequency === "MONTHLY"
          ? "CONVERT_TO_1ST_NEXT_MONTH"
          : "EXACT_DAY",

      processingFee: 0,
    });

    const oldEmi =
      unpaid.length > 0
        ? round2(
            toNumber(unpaid[0]!.principalDue) +
              toNumber(unpaid[0]!.interestDue),
          )
        : null;

    await this.prisma.$transaction(async (tx) => {
      for (let idx = 0; idx < unpaid.length; idx++) {
        const inst = unpaid[idx]!;

        const row = regenerated.schedule[idx];

        if (!row) {
          await tx.installment.delete({ where: { id: inst.id } });

          continue;
        }

        const alreadyPaidP = toNumber(inst.paidPrincipal);

        const alreadyPaidI = toNumber(inst.paidInterest);

        await tx.installment.update({
          where: { id: inst.id },

          data: {
            principalDue: money(Math.max(row.principalDue, alreadyPaidP)),

            interestDue: money(Math.max(row.interestDue, alreadyPaidI)),
          },
        });
      }

      if (regenerated.schedule.length < unpaid.length) {
        const extra = unpaid.slice(regenerated.schedule.length);

        for (const inst of extra) {
          await tx.installment.delete({ where: { id: inst.id } });
        }
      }

      if (regenerated.schedule.length > unpaid.length) {
        const lastNumber = unpaid[unpaid.length - 1]?.number ?? 0;

        for (let j = unpaid.length; j < regenerated.schedule.length; j++) {
          const row = regenerated.schedule[j]!;

          await tx.installment.create({
            data: {
              loanId,

              number: lastNumber + (j - unpaid.length) + 1,

              dueDate: row.dueDate,

              principalDue: money(row.principalDue),

              interestDue: money(row.interestDue),

              status: InstallmentStatus.PENDING,
            },
          });
        }
      }

      await tx.loanRestructure.create({
        data: {
          loanId,

          oldTenure: loan.tenureInstallments,

          newTenure,

          oldRate: loan.annualRatePercent,

          newRate: money(newRate),

          oldEmiAmount: oldEmi != null ? money(oldEmi) : undefined,

          newEmiAmount: regenerated.emiAmount
            ? money(regenerated.emiAmount)
            : newEmiAmount != null
              ? money(newEmiAmount)
              : undefined,

          reason: payload.reason ? String(payload.reason) : undefined,
        },
      });

      await tx.loan.update({
        where: { id: loanId },

        data: {
          tenureInstallments: newTenure,

          annualRatePercent: money(newRate),

          restructureCount: { increment: 1 },
        },
      });
    });

    await this.audit.append({
      companyId: loan.companyId,

      actorId: actor.id,

      action: "loan.restructure",

      entityType: "Loan",

      entityId: loanId,

      after: { newTenure, newRate, newEmiAmount },
    });
  }
}
