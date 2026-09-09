import { BillingCadence } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  billingPeriodForCadence,
  coveredMonthKeysFromPeriod,
  formatInvoicePeriodLabel,
  mergeInvoicePeriods,
  presentInvoicePeriod,
} from "./invoice-period";

describe("billingPeriodForCadence", () => {
  it("stamps the UTC month of the invoice, not a later paid-at day", () => {
    const paidLater = new Date(Date.UTC(2026, 8, 10, 15, 0, 0));
    const { periodStart, periodEnd } = billingPeriodForCadence(
      new Date(Date.UTC(2026, 7, 1)),
      BillingCadence.MONTHLY,
    );
    expect(periodStart.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2026-08-31T23:59:59.999Z");
    expect(
      billingPeriodForCadence(
        paidLater,
        BillingCadence.MONTHLY,
      ).periodStart.toISOString(),
    ).toBe("2026-09-01T00:00:00.000Z");
  });

  it("covers three months for quarterly", () => {
    const { periodStart, periodEnd } = billingPeriodForCadence(
      new Date(Date.UTC(2026, 5, 1)),
      BillingCadence.QUARTERLY,
    );
    expect(coveredMonthKeysFromPeriod(periodStart, periodEnd)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(formatInvoicePeriodLabel(["2026-06", "2026-07", "2026-08"])).toBe(
      "Jun, Jul, Aug 2026",
    );
  });
});

describe("presentInvoicePeriod", () => {
  it("uses the stored invoice period, not membership paid later", () => {
    expect(
      presentInvoicePeriod({
        periodStart: new Date(Date.UTC(2026, 5, 1)),
        periodEnd: new Date(Date.UTC(2026, 5, 30, 23, 59, 59, 999)),
        membership: {
          periodStart: new Date(Date.UTC(2026, 7, 1)),
          periodEnd: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
        },
      }),
    ).toEqual({
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-30T23:59:59.999Z",
      billMonthKeys: ["2026-06"],
      billPeriodLabel: "Jun 2026",
    });
  });

  it("falls back to membership for legacy rows with no stored period", () => {
    expect(
      presentInvoicePeriod({
        periodStart: null,
        membership: {
          periodStart: new Date(Date.UTC(2026, 8, 1)),
          periodEnd: new Date(Date.UTC(2026, 8, 30, 23, 59, 59, 999)),
        },
      }).billPeriodLabel,
    ).toBe("Sept 2026");
  });

  it("returns empty keys when no period exists (unpaid without membership)", () => {
    expect(
      presentInvoicePeriod({ periodStart: null, membership: null }),
    ).toEqual({
      periodStart: null,
      periodEnd: null,
      billMonthKeys: [],
      billPeriodLabel: null,
    });
  });
});

describe("mergeInvoicePeriods", () => {
  it("spans the earliest start through the latest end", () => {
    const merged = mergeInvoicePeriods([
      {
        periodStart: new Date(Date.UTC(2026, 5, 1)),
        periodEnd: new Date(Date.UTC(2026, 5, 30, 23, 59, 59, 999)),
      },
      {
        periodStart: new Date(Date.UTC(2026, 6, 1)),
        periodEnd: new Date(Date.UTC(2026, 8, 30, 23, 59, 59, 999)),
      },
    ]);
    expect(
      coveredMonthKeysFromPeriod(merged.periodStart, merged.periodEnd),
    ).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
  });
});
