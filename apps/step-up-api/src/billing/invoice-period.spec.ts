import { BillingCadence } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  billingPeriodForCadence,
  coveredMonthKeysFromPeriod,
  formatInvoicePeriodLabel,
  invoiceOverlapsRange,
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

describe("invoiceOverlapsRange", () => {
  const august = {
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-31T23:59:59.999Z"),
  };

  it("includes invoices whose stored period overlaps the selected month", () => {
    expect(
      invoiceOverlapsRange(
        august,
        new Date("2026-08-01T00:00:00.000Z"),
        new Date("2026-08-31T23:59:59.999Z"),
      ),
    ).toBe(true);
    expect(
      invoiceOverlapsRange(
        {
          ...august,
          paidAt: new Date("2026-09-10T12:00:00.000Z"),
        },
        new Date("2026-09-01T00:00:00.000Z"),
        new Date("2026-09-30T23:59:59.999Z"),
      ),
    ).toBe(false);
  });

  it("includes a quarterly invoice in each covered month", () => {
    const quarterly = {
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-31T23:59:59.999Z"),
    };
    expect(
      invoiceOverlapsRange(
        quarterly,
        new Date("2026-07-01T00:00:00.000Z"),
        new Date("2026-07-31T23:59:59.999Z"),
      ),
    ).toBe(true);
    expect(
      invoiceOverlapsRange(
        quarterly,
        new Date("2026-09-01T00:00:00.000Z"),
        new Date("2026-09-30T23:59:59.999Z"),
      ),
    ).toBe(false);
  });

  it("treats a missing range as unfiltered", () => {
    expect(invoiceOverlapsRange(august, null, null)).toBe(true);
  });
});

describe("presentInvoicePeriod", () => {
  it("uses the stored invoice period, not a later membership month", () => {
    expect(
      presentInvoicePeriod({
        periodStart: new Date(Date.UTC(2026, 5, 1)),
        periodEnd: new Date(Date.UTC(2026, 5, 30, 23, 59, 59, 999)),
      }),
    ).toEqual({
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-30T23:59:59.999Z",
      billMonthKeys: ["2026-06"],
      billPeriodLabel: "Jun 2026",
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
