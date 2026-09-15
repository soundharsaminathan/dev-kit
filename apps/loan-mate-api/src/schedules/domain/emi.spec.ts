import { describe, expect, it } from "vitest";
import { generateSchedule, round2, totalOutstandingFromSchedule } from "./emi";

describe("EMI engine — reducing equated Actual/365", () => {
  it("weekly: 7-day periods clear principal", () => {
    const result = generateSchedule({
      principal: 10_000,
      annualRatePercent: 36,
      tenureInstallments: 4,
      frequency: "WEEKLY",
      disbursementDate: new Date(2026, 0, 1),
    });

    expect(result.schedule).toHaveLength(4);
    expect(result.emiAmount).toBeGreaterThan(0);
    const last = result.schedule[result.schedule.length - 1]!;
    expect(last.closingBalance).toBe(0);

    const totalPrincipal = round2(
      result.schedule.reduce((s, r) => s + r.principalDue, 0),
    );
    expect(totalPrincipal).toBe(10_000);
  });

  it("biweekly: 14-day periods", () => {
    const result = generateSchedule({
      principal: 50_000,
      annualRatePercent: 24,
      tenureInstallments: 6,
      frequency: "BIWEEKLY",
      disbursementDate: new Date(2026, 2, 15),
    });
    expect(result.schedule).toHaveLength(6);
    expect(result.schedule[0]!.dueDate).toEqual(new Date(2026, 2, 29));
    expect(result.schedule[5]!.closingBalance).toBe(0);
  });

  it("monthly EXACT_DAY clamps and may land same/next month", () => {
    const result = generateSchedule({
      principal: 100_000,
      annualRatePercent: 18,
      tenureInstallments: 12,
      frequency: "MONTHLY",
      disbursementDate: new Date(2026, 0, 31),
      monthlyFirstEmiOption: "EXACT_DAY",
    });
    // Jan 31 → first EMI Feb 28 (clamp)
    expect(result.schedule[0]!.dueDate).toEqual(new Date(2026, 1, 28));
    expect(result.schedule[11]!.closingBalance).toBe(0);
  });

  it("monthly CONVERT_TO_1ST_PARTIAL deducts partial interest from disbursement", () => {
    const result = generateSchedule({
      principal: 100_000,
      annualRatePercent: 18,
      tenureInstallments: 3,
      frequency: "MONTHLY",
      disbursementDate: new Date(2026, 0, 15),
      monthlyFirstEmiOption: "CONVERT_TO_1ST_PARTIAL",
      processingFee: 500,
    });
    expect(result.schedule[0]!.dueDate).toEqual(new Date(2026, 1, 1));
    expect(result.partialInterestDeducted).toBeGreaterThan(0);
    expect(result.netDisbursement).toBe(
      round2(100_000 - 500 - result.partialInterestDeducted),
    );
  });

  it("monthly CONVERT_TO_1ST_NEXT_MONTH ignores partial interest", () => {
    const result = generateSchedule({
      principal: 100_000,
      annualRatePercent: 18,
      tenureInstallments: 3,
      frequency: "MONTHLY",
      disbursementDate: new Date(2026, 0, 15),
      monthlyFirstEmiOption: "CONVERT_TO_1ST_NEXT_MONTH",
    });
    expect(result.schedule[0]!.dueDate).toEqual(new Date(2026, 1, 1));
    expect(result.partialInterestDeducted).toBe(0);
    expect(result.netDisbursement).toBe(100_000);
  });

  it("golden: known weekly schedule interest uses Actual/365", () => {
    // 10000 @ 36.5%/yr for 7 days ≈ 10000 * 0.365 * 7/365 = 70
    const result = generateSchedule({
      principal: 10_000,
      annualRatePercent: 36.5,
      tenureInstallments: 2,
      frequency: "WEEKLY",
      disbursementDate: new Date(2026, 0, 1),
    });
    expect(result.schedule[0]!.interestDue).toBe(70);
  });

  it("totalOutstandingFromSchedule sums remainders", () => {
    expect(
      totalOutstandingFromSchedule([
        {
          principalDue: 100,
          interestDue: 10,
          penaltyDue: 5,
          paidPrincipal: 40,
          paidInterest: 10,
          paidPenalty: 0,
        },
      ]),
    ).toBe(65);
  });
});
