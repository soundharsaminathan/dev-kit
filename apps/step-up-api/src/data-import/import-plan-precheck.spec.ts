import {
  BatchCategory,
  BillingCadence,
  IndividualAudience,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { collectImportPlanPrecheckErrors } from "./import-plan-precheck";

const AUDIENCE = (category: BatchCategory) =>
  category === BatchCategory.KIDS
    ? IndividualAudience.KID
    : IndividualAudience.ADULT;

const CATALOG = [
  {
    id: "sub-month",
    name: "Kids Monthly",
    billingCadence: BillingCadence.MONTHLY,
    individualAudience: IndividualAudience.KID,
  },
  {
    id: "sub-quarter",
    name: "Kids Quarterly",
    billingCadence: BillingCadence.QUARTERLY,
    individualAudience: IndividualAudience.KID,
  },
];

describe("collectImportPlanPrecheckErrors", () => {
  it("returns no errors when no plan names are referenced", () => {
    expect(
      collectImportPlanPrecheckErrors({
        batches: [],
        enrollments: [],
        invoices: [],
        catalog: CATALOG,
        existingBatches: [],
        batchPlanSubscriptionIdsByBatchId: new Map(),
        audienceForBatchCategory: AUDIENCE,
      }),
    ).toEqual([]);
  });

  it("flags plan names missing from the studio catalog", () => {
    const errors = collectImportPlanPrecheckErrors({
      batches: [],
      enrollments: [
        {
          studentEmail: "kid@example.com",
          batchName: "Kids Hip-Hop",
          enrolledAt: "2026-01-15",
          status: "ACTIVE",
          planName: "Unknown Plan",
        },
      ],
      invoices: [],
      catalog: CATALOG,
      existingBatches: [
        {
          id: "batch-1",
          name: "Kids Hip-Hop",
          category: BatchCategory.KIDS,
        },
      ],
      batchPlanSubscriptionIdsByBatchId: new Map([
        ["batch-1", new Set(["sub-month", "sub-quarter"])],
      ]),
      audienceForBatchCategory: AUDIENCE,
    });

    expect(errors).toContain(
      "Plan \"unknown plan\" was not found in this studio catalog.",
    );
  });

  it("flags enrollment plans not attached to the batch", () => {
    const errors = collectImportPlanPrecheckErrors({
      batches: [],
      enrollments: [
        {
          studentEmail: "kid@example.com",
          batchName: "Kids Hip-Hop",
          enrolledAt: "2026-01-15",
          status: "ACTIVE",
          planName: "Kids Monthly",
        },
      ],
      invoices: [],
      catalog: CATALOG,
      existingBatches: [
        {
          id: "batch-1",
          name: "Kids Hip-Hop",
          category: BatchCategory.KIDS,
        },
      ],
      batchPlanSubscriptionIdsByBatchId: new Map([
        ["batch-1", new Set(["sub-quarter"])],
      ]),
      audienceForBatchCategory: AUDIENCE,
    });

    expect(errors).toContain(
      "Plan \"Kids Monthly\" is not attached to batch \"Kids Hip-Hop\". Add Monthly/Quarterly plan names on the Batches sheet (or batch settings) first.",
    );
  });

  it("accepts enrollment plans listed on the import batch sheet", () => {
    const errors = collectImportPlanPrecheckErrors({
      batches: [
        {
          name: "Kids Hip-Hop",
          category: BatchCategory.KIDS,
          branchName: null,
          danceStyles: null,
          frequency: "WEEKLY",
          weekdays: [1],
          startTime: "16:00",
          endTime: "17:00",
          startDate: "2024-06-03",
          endDate: "2025-03-31",
          utcOffsetMinutes: 0,
          capacity: 12,
          enrollmentMode: "STAFF_ONLY",
          active: true,
          monthlyPlanName: "Kids Monthly",
          quarterlyPlanName: "Kids Quarterly",
        },
      ],
      enrollments: [
        {
          studentEmail: "kid@example.com",
          batchName: "Kids Hip-Hop",
          enrolledAt: "2026-01-15",
          status: "ACTIVE",
          planName: "Kids Monthly",
        },
      ],
      invoices: [],
      catalog: CATALOG,
      existingBatches: [],
      batchPlanSubscriptionIdsByBatchId: new Map(),
      audienceForBatchCategory: AUDIENCE,
    });

    expect(errors).toEqual([]);
  });
});
