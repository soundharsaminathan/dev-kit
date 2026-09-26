import { describe, expect, it } from "vitest";
import { generateSchedule, round2 } from "./emi";
import {
  approvalApplies,
  chequeRejection,
  creditScoreRejection,
  documentReviewRejection,
  feeWaiverRejection,
  kycDecisionRejection,
  trancheRejection,
} from "./lms-rules";

describe("LMS gap rules", () => {
  it("rejects a cheque with no bank or date", () => {
    expect(chequeRejection("CASH", undefined, undefined)).toBeNull();
    expect(chequeRejection("CHEQUE", "", "2026-01-01")).toBe(
      "Cheque requires a bank name",
    );
    expect(chequeRejection("CHEQUE", "HDFC", undefined)).toBe(
      "Cheque requires a cheque date",
    );
    expect(chequeRejection("CHEQUE", "HDFC", "2026-01-01")).toBeNull();
  });

  it("holds a multi-level approval until the last level", () => {
    expect(approvalApplies(1, 1)).toBe(true);
    expect(approvalApplies(1, 2)).toBe(false);
    expect(approvalApplies(2, 2)).toBe(true);
  });

  it("rejects a fee waiver when nothing is outstanding or the amount is too high", () => {
    expect(feeWaiverRejection(10, 0)).toBe("No charges left to waive");
    expect(feeWaiverRejection(50, 20)).toBe(
      "Waiver exceeds outstanding charges",
    );
    expect(feeWaiverRejection(20, 20)).toBeNull();
  });

  it("requires a reason to reject KYC and blocks self-review", () => {
    expect(kycDecisionRejection("REJECTED", "  ")).toBe(
      "Rejection reason required",
    );
    expect(kycDecisionRejection("VERIFIED", undefined)).toBeNull();
    expect(documentReviewRejection("u1", "u1")).toMatch(/own document/);
    expect(documentReviewRejection("u2", "u1")).toBeNull();
  });

  it("rejects a tranche that would release more than principal", () => {
    expect(trancheRejection(80_000, 30_000, 100_000)).toMatch(/exceed/);
    expect(trancheRejection(80_000, 20_000, 100_000)).toBeNull();
  });

  it("rejects a credit score outside 300–900", () => {
    expect(creditScoreRejection(299)).toMatch(/300/);
    expect(creditScoreRejection(720)).toBeNull();
  });

  it("flat interest clears principal and keeps total interest on the rate", () => {
    const result = generateSchedule({
      principal: 12_000,
      annualRatePercent: 12,
      tenureInstallments: 12,
      frequency: "MONTHLY",
      disbursementDate: new Date(2026, 0, 1),
      interestMethod: "FLAT",
    });
    const principal = round2(
      result.schedule.reduce((s, r) => s + r.principalDue, 0),
    );
    expect(principal).toBe(12_000);
    expect(result.schedule.at(-1)?.closingBalance).toBe(0);
    expect(result.schedule[0]?.interestDue).toBeGreaterThan(0);
  });

  it("moratorium rows do not take principal", () => {
    const result = generateSchedule({
      principal: 10_000,
      annualRatePercent: 24,
      tenureInstallments: 4,
      frequency: "MONTHLY",
      disbursementDate: new Date(2026, 0, 15),
      interestMethod: "REDUCING",
      moratoriumInstallments: 2,
    });
    expect(result.schedule[0]?.principalDue).toBe(0);
    expect(result.schedule[1]?.principalDue).toBe(0);
    const principal = round2(
      result.schedule.reduce((s, r) => s + r.principalDue, 0),
    );
    expect(principal).toBe(10_000);
  });
});
