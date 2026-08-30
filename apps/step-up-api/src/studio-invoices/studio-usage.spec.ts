import { describe, expect, it } from "vitest";
import {
  listAmountForPlan,
  monthBounds,
  payableAmount,
  suggestPlan,
  type StudioUsageCounts,
} from "./studio-usage";

const baseCounts = (
  overrides: Partial<StudioUsageCounts> = {},
): StudioUsageCounts => ({
  activeStudents: 50,
  trainers: 2,
  staff: 1,
  batches: 5,
  sessionsThisMonth: 40,
  ...overrides,
});

describe("studio-usage helpers", () => {
  it("suggests Basic within caps", () => {
    expect(suggestPlan(baseCounts())).toBe("BASIC");
    expect(listAmountForPlan("BASIC")).toBe(999);
  });

  it("suggests Advanced when any Basic cap is exceeded", () => {
    expect(suggestPlan(baseCounts({ activeStudents: 201 }))).toBe("ADVANCED");
    expect(suggestPlan(baseCounts({ batches: 11 }))).toBe("ADVANCED");
    expect(suggestPlan(baseCounts({ trainers: 4 }))).toBe("ADVANCED");
    expect(suggestPlan(baseCounts({ staff: 2 }))).toBe("ADVANCED");
    expect(listAmountForPlan("ADVANCED")).toBe(1499);
  });

  it("floors payable amount at zero", () => {
    expect(payableAmount(999, 100)).toBe(899);
    expect(payableAmount(999, 999)).toBe(0);
    expect(payableAmount(999, 1200)).toBe(0);
  });

  it("builds Kolkata month bounds that start on the 1st local midnight", () => {
    const { periodStart, periodEnd, month } = monthBounds(
      "2026-08",
      "Asia/Kolkata",
    );
    expect(month).toBe("2026-08");
    // Asia/Kolkata is UTC+5:30 → Aug 1 00:00 IST = Jul 31 18:30 UTC
    expect(periodStart.toISOString()).toBe("2026-07-31T18:30:00.000Z");
    expect(periodEnd.getTime()).toBeLessThan(
      monthBounds("2026-09", "Asia/Kolkata").periodStart.getTime(),
    );
    expect(periodEnd.getTime()).toBeGreaterThan(periodStart.getTime());
  });
});
