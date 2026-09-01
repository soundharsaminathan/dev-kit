import { describe, expect, it } from "vitest";
import {
  allocateFamilyDiscount,
  cadencePriceHint,
  formatInvoiceMonthLabel,
  formatInvoicePeriodLabel,
  type InvoicePaymentPlan,
  invoiceCoveredMonthKeys,
  invoiceMatchesMonth,
  invoiceMonthKey,
  invoicePeriodLabel,
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
  it("keys a billing period from membership.periodStart for unpaid invoices", () => {
    expect(
      invoiceMonthKey({
        status: "PENDING",
        membership: { periodStart: "2026-08-01T00:00:00.000Z" },
      }),
    ).toBe("2026-08");
  });

  it("prefers membership.periodStart over paidAt for PAID invoices", () => {
    expect(
      invoiceMonthKey({
        status: "PAID",
        membership: { periodStart: "2026-06-01T00:00:00.000Z" },
        paidAt: "2026-08-01T12:00:00.000Z",
      }),
    ).toBe("2026-06");
  });

  it("falls back to dueDate then paidAt when membership is missing", () => {
    expect(
      invoiceMonthKey({
        status: "PENDING",
        dueDate: "2026-07-31T23:59:59.999Z",
        paidAt: "2026-08-02T10:00:00.000Z",
      }),
    ).toBe("2026-07");
    expect(
      invoiceMonthKey({ status: "PAID", paidAt: "2026-06-15T08:00:00.000Z" }),
    ).toBe("2026-06");
  });

  it("returns null when no date is present", () => {
    expect(invoiceMonthKey({ status: "PENDING" })).toBeNull();
  });

  it("matches a selected month and treats ALL as unfiltered", () => {
    const invoice = {
      status: "PENDING" as const,
      membership: { periodStart: "2026-08-01T00:00:00.000Z" },
    };
    expect(invoiceMatchesMonth(invoice, "2026-08")).toBe(true);
    expect(invoiceMatchesMonth(invoice, "2026-07")).toBe(false);
    expect(invoiceMatchesMonth(invoice, "ALL")).toBe(true);
    expect(invoiceMatchesMonth({ status: "PENDING" }, "2026-08")).toBe(false);
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
  });

  it("lists all three months for a quarterly invoice", () => {
    const invoice = {
      status: "PAID" as const,
      membership: {
        periodStart: "2026-06-01T00:00:00.000Z",
        periodEnd: "2026-08-31T23:59:59.999Z",
        subscription: { billingCadence: "QUARTERLY" as const },
      },
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

  it("uses paymentPlan cadence when membership subscription is missing", () => {
    expect(
      invoiceCoveredMonthKeys({
        status: "PENDING",
        membership: { periodStart: "2026-12-01T00:00:00.000Z" },
        paymentPlan: { currentCadence: "QUARTERLY", options: [] },
      }),
    ).toEqual(["2026-12", "2027-01", "2027-02"]);
    expect(formatInvoicePeriodLabel(["2026-12", "2027-01", "2027-02"])).toBe(
      "Dec 2026, Jan 2027, Feb 2027",
    );
  });
});
