import { BatchCategory, PlanType, SubscriptionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  computePlatformFee,
  getFullBatchPeriod,
  getNextPeriodStart,
  getPeriodEnd,
  planCoversBatch,
  shouldConsumeCredit,
  subscriptionCoversBatch,
} from "./subscription-helpers";

describe("subscription-helpers", () => {
  it("starts mid-month subscriptions on the first of next month", () => {
    expect(
      getNextPeriodStart(new Date("2026-03-15T12:00:00Z")).toISOString(),
    ).toBe("2026-04-01T00:00:00.000Z");
    expect(
      getNextPeriodStart(new Date("2026-03-01T00:00:00Z")).toISOString(),
    ).toBe("2026-03-01T00:00:00.000Z");
  });

  it("ends periods on the last day of the month", () => {
    const end = getPeriodEnd(new Date("2026-03-01T00:00:00Z"));
    expect(end.toISOString()).toBe("2026-03-31T23:59:59.999Z");
  });

  it("builds full-batch periods from schedule dates", () => {
    const period = getFullBatchPeriod({
      startDate: "2026-07-01",
      endDate: "2026-09-30",
    });
    expect(period.periodStart.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(period.periodEnd.toISOString()).toBe("2026-09-30T23:59:59.999Z");
  });

  it("matches fixed batch plans to monthly or full-batch slots", () => {
    const plan = {
      id: "plan-1",
      type: PlanType.FIXED_BATCH,
      active: true,
    };
    const batch = {
      id: "batch-1",
      monthlyPlanId: "plan-1",
      fullBatchPlanId: null,
      category: BatchCategory.KIDS,
    };

    expect(planCoversBatch(plan, batch)).toBe(true);
    expect(
      planCoversBatch(plan, {
        ...batch,
        id: "batch-2",
        monthlyPlanId: "plan-2",
        fullBatchPlanId: null,
      }),
    ).toBe(false);
    expect(
      planCoversBatch(plan, {
        ...batch,
        monthlyPlanId: null,
        fullBatchPlanId: "plan-1",
      }),
    ).toBe(true);
  });

  it("matches unlimited plans by batch category", () => {
    const kidsPlan = {
      id: "plan-kids",
      type: PlanType.UNLIMITED_KIDS,
      active: true,
    };
    const adultsBatch = {
      id: "batch-a",
      monthlyPlanId: null,
      fullBatchPlanId: null,
      category: BatchCategory.ADULTS,
    };
    const kidsBatch = {
      id: "batch-k",
      monthlyPlanId: null,
      fullBatchPlanId: null,
      category: BatchCategory.KIDS,
    };

    expect(planCoversBatch(kidsPlan, kidsBatch)).toBe(true);
    expect(planCoversBatch(kidsPlan, adultsBatch)).toBe(false);
  });

  it("requires remaining credits for fixed batch coverage", () => {
    const subscription = {
      status: SubscriptionStatus.ACTIVE,
      periodStart: new Date("2026-03-01"),
      periodEnd: new Date("2026-03-31T23:59:59.999Z"),
      creditsRemaining: 0,
      plan: {
        id: "plan-1",
        type: PlanType.FIXED_BATCH,
        active: true,
      },
    };
    const batch = {
      id: "batch-1",
      monthlyPlanId: "plan-1",
      fullBatchPlanId: null,
      category: BatchCategory.KIDS,
    };

    expect(
      subscriptionCoversBatch(subscription, batch, new Date("2026-03-15")),
    ).toBe(false);

    expect(
      subscriptionCoversBatch(
        { ...subscription, creditsRemaining: 2 },
        batch,
        new Date("2026-03-15"),
      ),
    ).toBe(true);
  });

  it("consumes credits for fixed batch plans regardless of attendance status", () => {
    expect(shouldConsumeCredit(PlanType.FIXED_BATCH)).toBe(true);
    expect(shouldConsumeCredit(PlanType.UNLIMITED_KIDS)).toBe(false);
  });

  it("computes platform fee from invoice amount", () => {
    expect(computePlatformFee(1000, 5)).toBe(50);
    expect(computePlatformFee(999, 5)).toBe(49.95);
  });
});
