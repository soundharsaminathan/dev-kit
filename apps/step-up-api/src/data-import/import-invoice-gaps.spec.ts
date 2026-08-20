import { BillingCadence, InvoiceStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildImportGapInvoices,
  coveredMonthKeys,
} from "./import-invoice-gaps";

const NOW = new Date("2026-08-20T12:00:00.000Z");

describe("coveredMonthKeys", () => {
  it("marks three months for a quarterly payment", () => {
    expect(
      coveredMonthKeys(
        new Date("2026-06-01T12:00:00.000Z"),
        BillingCadence.QUARTERLY,
      ),
    ).toEqual(["2026-06", "2026-07", "2026-08"]);
  });

  it("marks one month for a monthly payment", () => {
    expect(
      coveredMonthKeys(
        new Date("2026-08-01T12:00:00.000Z"),
        BillingCadence.MONTHLY,
      ),
    ).toEqual(["2026-08"]);
  });
});

describe("buildImportGapInvoices", () => {
  it("creates no gaps when quarterly payment covers Jun–Aug for active enroll", () => {
    const gaps = buildImportGapInvoices({
      now: NOW,
      enrollments: [
        {
          studentId: "s1",
          batchId: "b1",
          enrolledAt: new Date("2026-06-05T12:00:00.000Z"),
          endedAt: null,
          planCadence: BillingCadence.QUARTERLY,
          planPrice: 5000,
          subscriptionId: "sub-q",
        },
      ],
      paidInvoices: [
        {
          studentId: "s1",
          batchId: "b1",
          paidAt: new Date("2026-06-01T12:00:00.000Z"),
          cadence: BillingCadence.QUARTERLY,
        },
      ],
    });
    expect(gaps).toEqual([]);
  });

  it("does not create monthly unpaid invoices inside a quarterly paid window", () => {
    const gaps = buildImportGapInvoices({
      now: NOW,
      enrollments: [
        {
          studentId: "s1",
          batchId: "b1",
          enrolledAt: new Date("2026-06-05T12:00:00.000Z"),
          endedAt: null,
          planCadence: BillingCadence.MONTHLY,
          planPrice: 2000,
          subscriptionId: "sub-m",
        },
      ],
      paidInvoices: [
        {
          studentId: "s1",
          batchId: "b1",
          paidAt: new Date("2026-06-01T12:00:00.000Z"),
          cadence: BillingCadence.QUARTERLY,
        },
      ],
    });
    expect(gaps).toEqual([]);
  });

  it("creates OVERDUE for Jun/Jul when monthly enroll paid only in Aug (Zeffvian)", () => {
    const gaps = buildImportGapInvoices({
      now: NOW,
      enrollments: [
        {
          studentId: "zeff",
          batchId: "b1",
          enrolledAt: new Date("2026-06-05T12:00:00.000Z"),
          endedAt: null,
          planCadence: BillingCadence.MONTHLY,
          planPrice: 2000,
          subscriptionId: "sub-m",
        },
      ],
      paidInvoices: [
        {
          studentId: "zeff",
          batchId: "b1",
          paidAt: new Date("2026-08-01T12:00:00.000Z"),
          cadence: BillingCadence.MONTHLY,
        },
      ],
    });
    expect(gaps).toHaveLength(2);
    expect(gaps.map((g) => g.periodStart.toISOString())).toEqual([
      "2026-06-01T00:00:00.000Z",
      "2026-07-01T00:00:00.000Z",
    ]);
    expect(gaps.every((g) => g.status === InvoiceStatus.OVERDUE)).toBe(true);
    expect(gaps.every((g) => g.amount === 2000)).toBe(true);
  });

  it("creates OVERDUE for Jul when monthly enroll in Jul paid only in Aug (Kaaviya)", () => {
    const gaps = buildImportGapInvoices({
      now: NOW,
      enrollments: [
        {
          studentId: "kaa",
          batchId: "b1",
          enrolledAt: new Date("2026-07-03T12:00:00.000Z"),
          endedAt: null,
          planCadence: BillingCadence.MONTHLY,
          planPrice: 3000,
          subscriptionId: "sub-m",
        },
      ],
      paidInvoices: [
        {
          studentId: "kaa",
          batchId: "b1",
          paidAt: new Date("2026-08-01T12:00:00.000Z"),
          cadence: BillingCadence.MONTHLY,
        },
      ],
    });
    expect(gaps).toEqual([
      expect.objectContaining({
        studentId: "kaa",
        status: InvoiceStatus.OVERDUE,
        amount: 3000,
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
      }),
    ]);
  });

  it("stops at endedAt and does not bill after", () => {
    const gaps = buildImportGapInvoices({
      now: NOW,
      enrollments: [
        {
          studentId: "s1",
          batchId: "b1",
          enrolledAt: new Date("2026-06-05T12:00:00.000Z"),
          endedAt: new Date("2026-07-15T12:00:00.000Z"),
          planCadence: BillingCadence.MONTHLY,
          planPrice: 2000,
          subscriptionId: "sub-m",
        },
      ],
      paidInvoices: [],
    });
    expect(gaps.map((g) => monthLabel(g.periodStart))).toEqual([
      "2026-06",
      "2026-07",
    ]);
  });

  it("creates PENDING for current month when uncovered", () => {
    const gaps = buildImportGapInvoices({
      now: NOW,
      enrollments: [
        {
          studentId: "s1",
          batchId: "b1",
          enrolledAt: new Date("2026-08-02T12:00:00.000Z"),
          endedAt: null,
          planCadence: BillingCadence.MONTHLY,
          planPrice: 2000,
          subscriptionId: "sub-m",
        },
      ],
      paidInvoices: [],
    });
    expect(gaps).toEqual([
      expect.objectContaining({
        status: InvoiceStatus.PENDING,
        periodStart: new Date("2026-08-01T00:00:00.000Z"),
      }),
    ]);
  });

  it("creates one OVERDUE quarterly period when enroll has no payment", () => {
    const gaps = buildImportGapInvoices({
      now: NOW,
      enrollments: [
        {
          studentId: "s1",
          batchId: "b1",
          enrolledAt: new Date("2026-06-05T12:00:00.000Z"),
          endedAt: null,
          planCadence: BillingCadence.QUARTERLY,
          planPrice: 5000,
          subscriptionId: "sub-q",
        },
      ],
      paidInvoices: [],
    });
    // Jun quarter covers Jun–Aug; one expected start in window → OVERDUE (starts in past)
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      status: InvoiceStatus.OVERDUE,
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      amount: 5000,
    });
  });

  it("skips periods that already have an invoice (idempotent)", () => {
    const gaps = buildImportGapInvoices({
      now: NOW,
      enrollments: [
        {
          studentId: "zeff",
          batchId: "b1",
          enrolledAt: new Date("2026-06-05T12:00:00.000Z"),
          endedAt: null,
          planCadence: BillingCadence.MONTHLY,
          planPrice: 2000,
          subscriptionId: "sub-m",
        },
      ],
      paidInvoices: [
        {
          studentId: "zeff",
          batchId: "b1",
          paidAt: new Date("2026-08-01T12:00:00.000Z"),
          cadence: BillingCadence.MONTHLY,
        },
      ],
      existingPeriods: [
        {
          studentId: "zeff",
          batchId: "b1",
          periodStart: new Date("2026-06-01T00:00:00.000Z"),
        },
      ],
    });
    expect(gaps.map((g) => monthLabel(g.periodStart))).toEqual(["2026-07"]);
  });

  it("creates zero gaps when monthly payments cover every month", () => {
    const gaps = buildImportGapInvoices({
      now: NOW,
      enrollments: [
        {
          studentId: "s1",
          batchId: "b1",
          enrolledAt: new Date("2026-06-05T12:00:00.000Z"),
          endedAt: null,
          planCadence: BillingCadence.MONTHLY,
          planPrice: 2000,
          subscriptionId: "sub-m",
        },
      ],
      paidInvoices: [
        {
          studentId: "s1",
          batchId: "b1",
          paidAt: new Date("2026-06-01T12:00:00.000Z"),
          cadence: BillingCadence.MONTHLY,
        },
        {
          studentId: "s1",
          batchId: "b1",
          paidAt: new Date("2026-07-01T12:00:00.000Z"),
          cadence: BillingCadence.MONTHLY,
        },
        {
          studentId: "s1",
          batchId: "b1",
          paidAt: new Date("2026-08-01T12:00:00.000Z"),
          cadence: BillingCadence.MONTHLY,
        },
      ],
    });
    expect(gaps).toEqual([]);
  });
});

function monthLabel(at: Date): string {
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
}
