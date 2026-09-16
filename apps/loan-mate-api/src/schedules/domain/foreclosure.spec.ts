import { describe, expect, it } from "vitest";
import { accruedInterestToDate } from "./foreclosure";

describe("accruedInterestToDate (Q46)", () => {
  it("computes Actual/365 interest for 10 days on 80000 at 18%", () => {
    const from = new Date(2026, 8, 1);
    const asOf = new Date(2026, 8, 11);
    expect(
      accruedInterestToDate({
        principalOutstanding: 80_000,
        annualRatePercent: 18,
        fromDate: from,
        asOfDate: asOf,
      }),
    ).toBe(394.52);
  });

  it("returns 0 when asOf is on or before fromDate", () => {
    const d = new Date(2026, 8, 1);
    expect(
      accruedInterestToDate({
        principalOutstanding: 80_000,
        annualRatePercent: 18,
        fromDate: d,
        asOfDate: d,
      }),
    ).toBe(0);
  });
});
