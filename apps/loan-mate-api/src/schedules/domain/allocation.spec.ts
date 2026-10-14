import { describe, expect, it } from "vitest";
import {
  allocatePayment,
  totalOutstanding,
  type AllocatableInstallment,
} from "./allocation";

function inst(
  partial: Partial<AllocatableInstallment> & { id: string; dueDate: Date },
): AllocatableInstallment {
  return {
    principalDue: 1000,
    interestDue: 100,
    penaltyDue: 50,
    paidPrincipal: 0,
    paidInterest: 0,
    paidPenalty: 0,
    ...partial,
  };
}

describe("payment allocation — Penalty → Interest → Principal oldest-first", () => {
  const older = inst({
    id: "a",
    dueDate: new Date(2026, 0, 1),
    penaltyDue: 50,
    interestDue: 100,
    principalDue: 1000,
  });
  const newer = inst({
    id: "b",
    dueDate: new Date(2026, 1, 1),
    penaltyDue: 20,
    interestDue: 80,
    principalDue: 900,
  });

  it("pays penalty first on oldest installment", () => {
    const result = allocatePayment(50, [newer, older]);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toEqual({
      installmentId: "a",
      penalty: 50,
      interest: 0,
      principal: 0,
    });
    expect(result.remaining).toBe(0);
  });

  it("flows P→I→Prin across oldest then next", () => {
    // older total = 1150; pay 1200 → clear older + 50 of newer penalty
    const result = allocatePayment(1200, [older, newer]);
    expect(result.lines[0]!.installmentId).toBe("a");
    expect(result.lines[0]!.penalty).toBe(50);
    expect(result.lines[0]!.interest).toBe(100);
    expect(result.lines[0]!.principal).toBe(1000);
    expect(result.lines[1]!.installmentId).toBe("b");
    expect(result.lines[1]!.penalty).toBe(20);
    expect(result.lines[1]!.interest).toBe(30);
    expect(result.remaining).toBe(0);
  });

  it("leaves remaining when amount exceeds open installments given", () => {
    const result = allocatePayment(2000, [older]);
    expect(result.allocated).toBe(1150);
    expect(result.remaining).toBe(850);
  });

  it("totalOutstanding sums all buckets", () => {
    expect(totalOutstanding([older, newer])).toBe(1150 + 1000);
  });

  it("respects already-paid amounts", () => {
    const partial = inst({
      id: "p",
      dueDate: new Date(2026, 0, 1),
      penaltyDue: 50,
      paidPenalty: 50,
      interestDue: 100,
      paidInterest: 40,
      principalDue: 1000,
      paidPrincipal: 0,
    });
    const result = allocatePayment(100, [partial]);
    expect(result.lines[0]).toEqual({
      installmentId: "p",
      penalty: 0,
      interest: 60,
      principal: 40,
    });
  });
});
