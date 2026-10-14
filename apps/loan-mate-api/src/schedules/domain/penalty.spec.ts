import { describe, expect, it } from "vitest";
import {
  accruePenalty,
  computePenaltyDue,
  penaltyAccrualDays,
  unpaidEmiAmount,
} from "./penalty";

describe("penalty accrual", () => {
  it("unpaid EMI excludes paid portions and ignores penalty bucket", () => {
    expect(
      unpaidEmiAmount({
        principalDue: 1000,
        interestDue: 100,
        paidPrincipal: 400,
        paidInterest: 100,
      }),
    ).toBe(600);
  });

  it("no accrual on or before due date", () => {
    expect(
      penaltyAccrualDays({
        dueDate: new Date(2026, 0, 10),
        asOfDate: new Date(2026, 0, 10),
        graceDays: 0,
        lastPenaltyDate: null,
      }),
    ).toBe(0);
  });

  it("overdue starts day after due; grace delays accrual only", () => {
    // Due Jan 10 → overdue from Jan 11; grace 2 → accrual from Jan 13
    expect(
      penaltyAccrualDays({
        dueDate: new Date(2026, 0, 10),
        asOfDate: new Date(2026, 0, 12),
        graceDays: 2,
        lastPenaltyDate: null,
      }),
    ).toBe(0);

    expect(
      penaltyAccrualDays({
        dueDate: new Date(2026, 0, 10),
        asOfDate: new Date(2026, 0, 13),
        graceDays: 2,
        lastPenaltyDate: null,
      }),
    ).toBe(1);

    expect(
      penaltyAccrualDays({
        dueDate: new Date(2026, 0, 10),
        asOfDate: new Date(2026, 0, 15),
        graceDays: 2,
        lastPenaltyDate: null,
      }),
    ).toBe(3);
  });

  it("does not double-count after lastPenaltyDate", () => {
    expect(
      penaltyAccrualDays({
        dueDate: new Date(2026, 0, 10),
        asOfDate: new Date(2026, 0, 15),
        graceDays: 0,
        lastPenaltyDate: new Date(2026, 0, 13),
      }),
    ).toBe(2); // 14 and 15
  });

  it("simple daily % no compounding", () => {
    // 1000 unpaid * 0.1%/day * 5 = 5
    expect(
      accruePenalty({ unpaidEmi: 1000, dailyPercent: 0.1, days: 5 }),
    ).toBe(5);
  });

  it("computePenaltyDue adds to existing", () => {
    const result = computePenaltyDue({
      principalDue: 1000,
      interestDue: 0,
      paidPrincipal: 0,
      paidInterest: 0,
      currentPenaltyDue: 2,
      dueDate: new Date(2026, 0, 1),
      asOfDate: new Date(2026, 0, 6),
      graceDays: 0,
      lastPenaltyDate: null,
      dailyPercent: 0.1,
    });
    // overdue days: Jan 2..6 = 5 days → 5
    expect(result.additionalPenalty).toBe(5);
    expect(result.newPenaltyDue).toBe(7);
  });
});
