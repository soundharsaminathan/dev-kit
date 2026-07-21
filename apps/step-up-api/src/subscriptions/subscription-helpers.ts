import { BatchCategory, PlanType, SubscriptionStatus } from "@prisma/client";

export interface PlanCoverageInput {
  id: string;
  type: PlanType;
  active: boolean;
}

export interface BatchCoverageInput {
  id: string;
  monthlyPlanId: string | null;
  fullBatchPlanId: string | null;
  category: BatchCategory;
}

export interface SubscriptionCoverageInput {
  status: SubscriptionStatus;
  periodStart: Date;
  periodEnd: Date;
  creditsRemaining: number | null;
  plan: PlanCoverageInput;
}

export type BatchScheduleDates = {
  startDate: string;
  endDate: string;
};

export function getNextPeriodStart(fromDate: Date = new Date()): Date {
  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth();
  const day = fromDate.getUTCDate();

  if (day === 1) {
    return new Date(Date.UTC(year, month, 1));
  }

  return new Date(Date.UTC(year, month + 1, 1));
}

export function getPeriodEnd(periodStart: Date): Date {
  const year = periodStart.getUTCFullYear();
  const month = periodStart.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
}

export function getFullBatchPeriod(schedule: BatchScheduleDates): {
  periodStart: Date;
  periodEnd: Date;
} {
  const startParts = schedule.startDate.split("-").map(Number);
  const endParts = schedule.endDate.split("-").map(Number);
  const [startYear, startMonth, startDay] = startParts;
  const [endYear, endMonth, endDay] = endParts;

  return {
    periodStart: new Date(Date.UTC(startYear, startMonth - 1, startDay)),
    periodEnd: new Date(
      Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999),
    ),
  };
}

export function planCoversBatch(
  plan: PlanCoverageInput,
  batch: BatchCoverageInput,
): boolean {
  if (!plan.active) {
    return false;
  }

  switch (plan.type) {
    case PlanType.FIXED_BATCH:
      return (
        batch.monthlyPlanId === plan.id || batch.fullBatchPlanId === plan.id
      );
    case PlanType.UNLIMITED_KIDS:
      return batch.category === BatchCategory.KIDS;
    case PlanType.UNLIMITED_ADULTS:
      return batch.category === BatchCategory.ADULTS;
    default:
      return false;
  }
}

export function subscriptionCoversBatch(
  subscription: SubscriptionCoverageInput,
  batch: BatchCoverageInput,
  at: Date = new Date(),
): boolean {
  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    return false;
  }

  if (at < subscription.periodStart || at > subscription.periodEnd) {
    return false;
  }

  if (!planCoversBatch(subscription.plan, batch)) {
    return false;
  }

  if (subscription.plan.type === PlanType.FIXED_BATCH) {
    return (subscription.creditsRemaining ?? 0) > 0;
  }

  return true;
}

export function shouldConsumeCredit(planType: PlanType): boolean {
  return planType === PlanType.FIXED_BATCH;
}

export function computePlatformFee(
  amount: number,
  platformFeePercent: number,
): number {
  return Math.round(amount * (platformFeePercent / 100) * 100) / 100;
}
