import { Inject, Injectable } from "@nestjs/common";
import { InstallmentStatus, LoanStatus } from "../generated/prisma";
import { money, toNumber } from "../common/money";
import { PrismaService } from "../prisma/prisma.service";
import { computePenaltyDue } from "../schedules/domain/penalty";

@Injectable()
export class OverdueJobsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Mark overdue installments and accrue penalty as of `asOf` (default today).
   * Callable once from worker.main or on a simple loop.
   */
  async runDailyOverdueAndPenalty(asOf: Date = new Date()) {
    const asOfDate = new Date(
      asOf.getFullYear(),
      asOf.getMonth(),
      asOf.getDate(),
    );

    const loans = await this.prisma.loan.findMany({
      where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.DISBURSED] } },
      include: {
        installments: true,
        company: { include: { settings: true } },
      },
    });

    let markedOverdue = 0;
    let accrued = 0;

    for (const loan of loans) {
      const graceDays = loan.company.settings?.graceDays ?? 0;
      const dailyPercent = toNumber(
        loan.penaltyDailyPercent ??
          loan.company.settings?.penaltyDailyPercent ??
          0.1,
      );

      for (const inst of loan.installments) {
        if (inst.status === InstallmentStatus.PAID) continue;

        const due = new Date(inst.dueDate);
        due.setHours(0, 0, 0, 0);
        const dayAfterDue = new Date(due);
        dayAfterDue.setDate(dayAfterDue.getDate() + 1);

        if (
          asOfDate.getTime() >= dayAfterDue.getTime() &&
          inst.status !== InstallmentStatus.OVERDUE
        ) {
          await this.prisma.installment.update({
            where: { id: inst.id },
            data: { status: InstallmentStatus.OVERDUE },
          });
          markedOverdue += 1;
        }

        const result = computePenaltyDue({
          principalDue: toNumber(inst.principalDue),
          interestDue: toNumber(inst.interestDue),
          paidPrincipal: toNumber(inst.paidPrincipal),
          paidInterest: toNumber(inst.paidInterest),
          currentPenaltyDue: toNumber(inst.penaltyDue),
          dueDate: inst.dueDate,
          asOfDate,
          graceDays,
          lastPenaltyDate: inst.lastPenaltyDate,
          dailyPercent,
        });

        if (result.additionalPenalty > 0) {
          await this.prisma.installment.update({
            where: { id: inst.id },
            data: {
              penaltyDue: money(result.newPenaltyDue),
              lastPenaltyDate: asOfDate,
              status: InstallmentStatus.OVERDUE,
            },
          });
          accrued += 1;
        }
      }
    }

    await this.prisma.outboxEvent.create({
      data: {
        type: "daily.overdue.completed",
        payload: {
          asOf: asOfDate.toISOString(),
          markedOverdue,
          accrued,
        },
      },
    });

    return { markedOverdue, accrued, asOf: asOfDate };
  }
}
