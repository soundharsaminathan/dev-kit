import { describe, expect, it } from "vitest";
import {
  allocateFamilyDiscount,
  cadencePriceHint,
  formatInvoiceMonthLabel,
  formatPriceParts,
  type InvoicePaymentPlan,
  invoiceCoveredMonthKeys,
  invoiceMatchesMonth,
  invoiceMonthKey,
  invoicePeriodLabel,
  invoicePrintPeriod,
  invoiceTilePeriodLabel,
  quarterlyPlanSavings,
  recentUtcMonthKeys,
  utcMonthKey,
} from "./invoice-types";

describe("allocateFamilyDiscount", () => {
  it("splits proportionally and puts remainder on the last invoice", () => {
    expect(allocateFamilyDiscount([1000, 2000], 100)).toEqual([33.33, 66.67]);
    expect(allocateFamilyDiscount([1000, 1000], 100)).toEqual([50, 50]);
  });

  it("rejects discount above the subtotal", () => {
    expect(() => allocateFamilyDiscount([500, 500], 1001)).toThrow(
      /invalid family discount/i,
    );
  });

  it("rejects negative discount", () => {
    expect(() => allocateFamilyDiscount([500, 500], -1)).toThrow(
      /invalid family discount/i,
    );
  });
});

describe("payment plan helpers", () => {
  const plan: InvoicePaymentPlan = {
    currentCadence: "MONTHLY",
    options: [
      {
        cadence: "MONTHLY",
        subscriptionId: "sub-m",
        price: 1999,
        label: "Monthly",
      },
      {
        cadence: "QUARTERLY",
        subscriptionId: "sub-q",
        price: 5499,
        label: "Quarterly",
      },
    ],
  };

  it("computes quarterly savings against 3× monthly", () => {
    expect(quarterlyPlanSavings(plan)).toBe(498);
  });

  it("formats cadence price hints with savings when positive", () => {
    expect(cadencePriceHint(plan, "MONTHLY")).toBe("₹1,999 / month");
    expect(cadencePriceHint(plan, "QUARTERLY")).toBe(
      "₹5,499 / 3 months · Save ₹498",
    );
  });
});

describe("invoice month filter", () => {
  it("keys a billing period from the stored invoice period", () => {
    expect(
      invoiceMonthKey({
        status: "PENDING",
        periodStart: "2026-08-01T00:00:00.000Z",
        periodEnd: "2026-08-31T23:59:59.999Z",
      }),
    ).toBe("2026-08");
  });

  it("uses stored periodStart, not paidAt, for PAID invoices", () => {
    expect(
      invoiceMonthKey({
        status: "PAID",
        periodStart: "2026-06-01T00:00:00.000Z",
        periodEnd: "2026-06-30T23:59:59.999Z",
        billMonthKeys: ["2026-06"],
        billPeriodLabel: "Jun 2026",
      }),
    ).toBe("2026-06");
  });

  it("does not infer a month from paidAt when the invoice has no period", () => {
    expect(
      invoiceMonthKey({
        status: "PAID",
        paidAt: "2026-08-02T10:00:00.000Z",
      } as never),
    ).toBeNull();
    expect(invoiceMonthKey({ status: "PENDING" })).toBeNull();
  });

  it("matches a selected month and treats ALL as unfiltered", () => {
    const invoice = {
      status: "PENDING" as const,
      billMonthKeys: ["2026-08"],
      billPeriodLabel: "Aug 2026",
    };
    expect(invoiceMatchesMonth(invoice, "2026-08")).toBe(true);
    expect(invoiceMatchesMonth(invoice, "2026-07")).toBe(false);
    expect(invoiceMatchesMonth(invoice, "ALL")).toBe(true);
    expect(invoiceMatchesMonth({ status: "PENDING" }, "2020-01")).toBe(false);
  });

  it("lists recent UTC months newest first including the current month", () => {
    const now = new Date("2026-08-13T18:00:00.000Z");
    expect(utcMonthKey(now)).toBe("2026-08");
    expect(recentUtcMonthKeys(3, now)).toEqual([
      "2026-08",
      "2026-07",
      "2026-06",
    ]);
    expect(formatInvoiceMonthLabel("2026-08")).toBe("Aug 2026");
    expect(formatInvoiceMonthLabel("2026-09")).toBe("Sept 2026");
  });

  it("lists all three months for a quarterly invoice", () => {
    const invoice = {
      status: "PAID" as const,
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-08-31T23:59:59.999Z",
      billMonthKeys: ["2026-06", "2026-07", "2026-08"],
      billPeriodLabel: "Jun, Jul, Aug 2026",
    };
    expect(invoiceCoveredMonthKeys(invoice)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(invoicePeriodLabel(invoice)).toBe("Jun, Jul, Aug 2026");
    expect(invoicePeriodLabel(invoice, "long")).toBe("June, July, August 2026");
    expect(invoiceMatchesMonth(invoice, "2026-07")).toBe(true);
    expect(invoiceMatchesMonth(invoice, "2026-09")).toBe(false);
  });

  it("uses API billPeriodLabel on tiles, including unpaid invoices", () => {
    expect(
      invoiceTilePeriodLabel({
        status: "PENDING",
        chargeType: "PREPAID_FULL",
        billPeriodLabel: "Aug 2026",
        billMonthKeys: ["2026-08"],
      }),
    ).toBe("Aug 2026");
    expect(
      invoiceTilePeriodLabel({
        status: "PAID",
        chargeType: "PREPAID_FULL",
        billPeriodLabel: "Jun 2026",
        billMonthKeys: ["2026-06"],
      }),
    ).toBe("Jun 2026");
  });

  it("labels admission fee tiles as Admission fee when the API has no period label", () => {
    expect(
      invoiceTilePeriodLabel({
        status: "PENDING",
        chargeType: "ADMISSION",
      }),
    ).toBe("Admission fee");
    expect(
      invoiceTilePeriodLabel({
        status: "PAID",
        chargeType: "ADMISSION",
        billPeriodLabel: "Aug 2026",
      }),
    ).toBe("Aug 2026");
  });

  it("falls back to membership period for legacy invoices without stored period", () => {
    expect(
      invoiceMonthKey({
        status: "PENDING",
        membership: { periodStart: "2026-04-01T00:00:00.000Z" },
      }),
    ).toBe("2026-04");
  });

  it("prints the stored period and ignores paidAt", () => {
    expect(
      invoicePrintPeriod({
        status: "PAID",
        periodStart: "2026-06-01T00:00:00.000Z",
        billMonthKeys: ["2026-06"],
        billPeriodLabel: "Jun 2026",
      }),
    ).toEqual({
      billMonth: "2026-06-01T00:00:00.000Z",
      billMonthKeys: ["2026-06"],
      billPeriodLabel: "June 2026",
    });
  });
});

describe("formatPriceParts", () => {
  it("splits the rupee mark from the digits", () => {
    expect(formatPriceParts(3500)).toEqual({
      currency: "₹",
      value: "3,500",
    });
  });
});
