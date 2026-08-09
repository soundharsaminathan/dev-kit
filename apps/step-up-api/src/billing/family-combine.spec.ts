import { BillingCadence } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  accumulatePaidMonths,
  allocateFamilyDiscount,
  attributionTargetsForInvoice,
  monthsForBillingCadence,
  parseCombineMeta,
} from "./family-combine";

describe("allocateFamilyDiscount", () => {
  it("splits proportional with remainder on the last invoice", () => {
    expect(allocateFamilyDiscount([1000, 2000], 300)).toEqual([100, 200]);
    expect(allocateFamilyDiscount([100, 100, 100], 10)).toEqual([
      3.33, 3.33, 3.34,
    ]);
  });

  it("rejects discount above subtotal (negative path)", () => {
    expect(() => allocateFamilyDiscount([100], 150)).toThrow(
      /cannot exceed/i,
    );
  });
});

describe("parseCombineMeta", () => {
  it("parses valid sources", () => {
    const meta = parseCombineMeta({
      sources: [
        {
          invoiceId: "a",
          studentId: "s1",
          batchId: "b1",
          originalAmount: 1000,
          allocatedDiscount: 100,
          netAmount: 900,
        },
      ],
    });
    expect(meta?.sources).toHaveLength(1);
    expect(meta?.sources[0]?.batchId).toBe("b1");
  });

  it("returns null for garbage", () => {
    expect(parseCombineMeta(null)).toBeNull();
    expect(parseCombineMeta({ sources: [{ invoiceId: 1 }] })).toBeNull();
  });
});

describe("attributionTargetsForInvoice", () => {
  it("credits each combine source batch instead of purchaser enrollments", () => {
    const studentBatchMap = new Map<string, Set<string>>([
      ["purchaser", new Set(["adult-batch"])],
      ["kid", new Set(["kids-batch"])],
    ]);
    const targets = attributionTargetsForInvoice({
      studentId: "purchaser",
      amount: 2700,
      status: "PAID",
      studentBatchMap,
      combineMeta: {
        sources: [
          {
            invoiceId: "i1",
            studentId: "purchaser",
            batchId: "adult-batch",
            originalAmount: 1000,
            allocatedDiscount: 100,
            netAmount: 900,
          },
          {
            invoiceId: "i2",
            studentId: "kid",
            batchId: "kids-batch",
            originalAmount: 2000,
            allocatedDiscount: 200,
            netAmount: 1800,
          },
        ],
      },
    });
    expect(targets).toEqual([
      { batchId: "adult-batch", amount: 900, studentId: "purchaser" },
      { batchId: "kids-batch", amount: 1800, studentId: "kid" },
    ]);
  });

  it("credits purchaseMeta.batchId instead of all enrollments", () => {
    const studentBatchMap = new Map<string, Set<string>>([
      ["s1", new Set(["b1", "b2"])],
    ]);
    const targets = attributionTargetsForInvoice({
      studentId: "s1",
      amount: 500,
      status: "PAID",
      studentBatchMap,
      combineMeta: null,
      purchaseMeta: {
        batchId: "b1",
        subscriptionId: "sub-1",
        purchaserUserId: "s1",
        coveredStudents: [{ studentId: "s1", seatRole: "KID", batchId: "b1" }],
      },
    });
    expect(targets).toEqual([
      { batchId: "b1", amount: 500, studentId: "s1" },
    ]);
  });

  it("does not fan out to every enrollment without batch metadata (negative path)", () => {
    const studentBatchMap = new Map<string, Set<string>>([
      ["s1", new Set(["b1", "b2"])],
    ]);
    const targets = attributionTargetsForInvoice({
      studentId: "s1",
      amount: 500,
      status: "PAID",
      studentBatchMap,
      combineMeta: null,
      purchaseMeta: null,
    });
    expect(targets).toEqual([]);
  });

  it("falls back to a single unambiguous enrollment without purchaseMeta", () => {
    const studentBatchMap = new Map<string, Set<string>>([
      ["s1", new Set(["b1"])],
    ]);
    const targets = attributionTargetsForInvoice({
      studentId: "s1",
      amount: 500,
      status: "PAID",
      studentBatchMap,
      combineMeta: null,
      purchaseMeta: null,
    });
    expect(targets).toEqual([
      { batchId: "b1", amount: 500, studentId: "s1" },
    ]);
  });
});

describe("accumulatePaidMonths", () => {
  it("credits each combine source student, not only the purchaser", () => {
    const months = accumulatePaidMonths([
      {
        studentId: "s1",
        combineMeta: {
          sources: [
            {
              invoiceId: "i1",
              studentId: "s1",
              batchId: "b1",
              originalAmount: 1000,
              allocatedDiscount: 100,
              netAmount: 900,
            },
            {
              invoiceId: "i2",
              studentId: "s2",
              batchId: "b2",
              originalAmount: 1000,
              allocatedDiscount: 100,
              netAmount: 900,
            },
          ],
        },
        membership: null,
      },
    ]);
    expect(months.get("s1")).toBe(1);
    expect(months.get("s2")).toBe(1);
  });

  it("does not double-count purchaser when they are also a combine source (negative path)", () => {
    const months = accumulatePaidMonths([
      {
        studentId: "s1",
        combineMeta: {
          sources: [
            {
              invoiceId: "i1",
              studentId: "s1",
              batchId: "b1",
              originalAmount: 1000,
              allocatedDiscount: 0,
              netAmount: 1000,
            },
            {
              invoiceId: "i2",
              studentId: "s2",
              batchId: "b2",
              originalAmount: 1000,
              allocatedDiscount: 0,
              netAmount: 1000,
            },
          ],
        },
        membership: {
          subscription: { billingCadence: BillingCadence.QUARTERLY },
        },
      },
    ]);
    expect(months.get("s1")).toBe(1);
    expect(months.get("s2")).toBe(1);
  });

  it("keeps individual invoice cadence when there is no combineMeta", () => {
    const months = accumulatePaidMonths([
      {
        studentId: "s1",
        combineMeta: null,
        membership: {
          subscription: { billingCadence: BillingCadence.QUARTERLY },
        },
      },
      {
        studentId: "s2",
        combineMeta: null,
        membership: {
          subscription: { billingCadence: BillingCadence.MONTHLY },
        },
      },
    ]);
    expect(months.get("s1")).toBe(3);
    expect(months.get("s2")).toBe(1);
  });

  it("can scope credits to a single covered student (profile card)", () => {
    const months = accumulatePaidMonths(
      [
        {
          studentId: "s1",
          combineMeta: {
            sources: [
              {
                invoiceId: "i1",
                studentId: "s1",
                batchId: "b1",
                originalAmount: 1000,
                allocatedDiscount: 0,
                netAmount: 1000,
              },
              {
                invoiceId: "i2",
                studentId: "s2",
                batchId: "b2",
                originalAmount: 1000,
                allocatedDiscount: 0,
                netAmount: 1000,
              },
            ],
          },
        },
      ],
      { onlyStudentIds: new Set(["s2"]) },
    );
    expect(months.get("s2")).toBe(1);
    expect(months.has("s1")).toBe(false);
  });
});

describe("monthsForBillingCadence", () => {
  it("maps quarterly to 3 months", () => {
    expect(monthsForBillingCadence(BillingCadence.QUARTERLY)).toBe(3);
    expect(monthsForBillingCadence(BillingCadence.MONTHLY)).toBe(1);
  });
});
