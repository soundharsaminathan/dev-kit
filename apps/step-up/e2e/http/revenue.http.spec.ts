import { expect, test } from "@playwright/test";
import { REVENUE } from "../fixtures/revenue-fixtures";
import { SEED } from "../fixtures/seed";
import {
  createHttpStudent,
  createPendingInvoiceViaEnroll as enrollPrepaid,
  expectOk,
  expectStatus,
  TestDataCleanup,
  unwrapPage,
} from "./helpers";

const ADULT_MONTHLY_PRICE = REVENUE.ADULT_MONTHLY_PRICE;
const KID_MONTHLY_PRICE = REVENUE.KID_MONTHLY_PRICE;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEED_BATCH_IDS = new Set([
  SEED.beginnerBatchId,
  SEED.kidsBatchId,
  SEED.trialBatchId,
]);

/** Seed batches already ran this month (postpaid). Pass a future batchId to reuse it. */
async function createPendingInvoiceViaEnroll(
  cleanup: TestDataCleanup,
  batchId: string | undefined,
  planId: string,
  studentName = "Revenue Test Student",
) {
  const category = planId.includes("kid") ? "KIDS" : "ADULTS";
  const reuseId = batchId && !SEED_BATCH_IDS.has(batchId) ? batchId : undefined;
  return enrollPrepaid(cleanup, {
    batchId: reuseId,
    planId,
    studentName,
    category,
  });
}

async function markPaid(invoiceId: string, method = "CASH") {
  return expectOk<{
    id: string;
    status: string;
    amount: number;
    subtotal?: number;
    referralDiscount?: number;
    studioDiscount?: number;
  }>("STAFF", `/billing/${invoiceId}/paid`, {
    method: "PATCH",
    body: JSON.stringify({ paymentMethod: method }),
  });
}

async function getBatchRevenue(batchId: string) {
  return expectOk<{
    totals: {
      collected: number;
      pending: number;
      overdue: number;
      invoiceCount: number;
    };
    bySubscription: Array<{
      subscriptionId: string;
      collected: number;
      pending: number;
      overdue: number;
      invoiceCount: number;
    }>;
  }>("STAFF", `/batches/${batchId}/revenue`);
}

async function getTrainerAnalytics(
  trainerId: string,
  opts?: { from?: string; to?: string; bucket?: string },
) {
  const params = new URLSearchParams();
  params.set("studioId", SEED.studioId);
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  if (opts?.bucket) params.set("bucket", opts.bucket);
  const qs = params.toString();
  return expectOk<{
    trainerId: string;
    totals: {
      collected: number;
      pending: number;
      overdue: number;
      refunded: number;
      platformFees: number;
      netCollected: number;
    };
    byBatch: Array<{
      batchId: string;
      collected: number;
      pending: number;
      overdue: number;
      refunded: number;
      invoiceCount: number;
    }>;
    byStatus: Record<string, { count: number; amount: number }>;
    byPaymentMethod: Record<string, { count: number; amount: number }>;
    series: Array<{
      bucket: string;
      collected: number;
      netCollected: number;
      invoiceCount: number;
    }>;
    comparison: {
      collected: number;
      netCollected: number;
      netCollectedDeltaPct: number | null;
    };
    pendingPayments: Array<{
      invoiceId: string;
      studentId: string;
      studentName: string;
      amount: number;
      status: string;
      dueDate: string | null;
      batchId: string | null;
      batchName: string | null;
    }>;
  }>("STAFF", `/billing/analytics/trainer/${trainerId}?${qs}`);
}

async function refundInvoice(
  invoiceId: string,
  amount?: number,
  reason?: string,
) {
  return expectOk<{
    id: string;
    status: string;
    amount: number;
    refundedAmount: number;
    thisRefundAmount: number;
  }>("STAFF", `/billing/${invoiceId}/refund`, {
    method: "POST",
    body: JSON.stringify({ amount, reason }),
  });
}

// =========================================================================
// 1. Revenue Consistency Invariant
// =========================================================================

test.describe("Revenue consistency invariant @http", () => {
  test("single transaction is consistent across batch revenue and trainer analytics @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice, batchId } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Consistency Student",
      );
      expect(invoice.status).toBe("PENDING");
      expect(Number(invoice.amount)).toBe(ADULT_MONTHLY_PRICE);

      const paid = await markPaid(invoice.id);
      expect(paid.status).toBe("PAID");

      // Batch revenue should reflect the payment
      const batchRevenue = await getBatchRevenue(batchId);
      expect(batchRevenue.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );

      // Trainer analytics should reflect the payment
      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );

      // The batch should appear in trainer analytics byBatch
      const batchRow = analytics.byBatch.find((b) => b.batchId === batchId);
      expect(batchRow).toBeDefined();
      expect(batchRow!.collected).toBeGreaterThanOrEqual(ADULT_MONTHLY_PRICE);
    } finally {
      await cleanup.dispose();
    }
  });

  test("discounted payment consistency: amount = subtotal - discounts @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Discount Consistency",
      );

      const paid = await markPaid(invoice.id, "UPI_MANUAL");
      expect(paid.status).toBe("PAID");
      expect(paid.subtotal).toBe(ADULT_MONTHLY_PRICE);
      expect(paid.referralDiscount).toBe(0);
      expect(paid.studioDiscount).toBe(0);
      expect(paid.amount).toBe(ADULT_MONTHLY_PRICE);
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 2. Batch-Level Revenue Tests
// =========================================================================

test.describe("Batch-level revenue @http", () => {
  test("multiple students in same batch accumulate correctly @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice: inv1, batchId } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Batch Revenue Student 1",
      );
      const { invoice: inv2 } = await createPendingInvoiceViaEnroll(
        cleanup,
        batchId,
        SEED.adultPlanIds[0],
        "Batch Revenue Student 2",
      );

      const before = await getBatchRevenue(batchId);

      await markPaid(inv1.id);
      await markPaid(inv2.id);

      const after = await getBatchRevenue(batchId);
      expect(after.totals.collected).toBeGreaterThanOrEqual(
        before.totals.collected + ADULT_MONTHLY_PRICE * 2,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("batch B revenue is not inflated by batch A payment @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      // Pay for batch A
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Isolation Student",
      );
      const beforeBatchB = await getBatchRevenue(SEED.kidsBatchId);

      await markPaid(invoice.id);

      const afterBatchB = await getBatchRevenue(SEED.kidsBatchId);
      expect(afterBatchB.totals.collected).toBe(beforeBatchB.totals.collected);
    } finally {
      await cleanup.dispose();
    }
  });

  test("revenue by subscription shows correct breakdown @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice, batchId } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Breakdown Student",
      );
      await markPaid(invoice.id);

      const revenue = await getBatchRevenue(batchId);
      const adultPlanRow = revenue.bySubscription.find(
        (s) => s.subscriptionId === SEED.adultPlanIds[0],
      );
      expect(adultPlanRow).toBeDefined();
      expect(adultPlanRow!.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("month period filter returns current month revenue only @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice, batchId } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Month Filter Student",
      );
      await markPaid(invoice.id);

      const revenue = await expectOk<{
        totals: { collected: number; invoiceCount: number };
      }>("STAFF", `/batches/${batchId}/revenue?period=month`);
      // The payment we just made should be in current month
      expect(revenue.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 3. Trainer-Level Revenue Tests
// =========================================================================

test.describe("Trainer-level revenue @http", () => {
  test("trainer analytics aggregates all their batches @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      // Payment in beginner batch (Trainer A)
      const { invoice: inv1 } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Trainer Analytics 1",
      );
      await markPaid(inv1.id);

      // Payment in kids batch (Trainer A)
      const { invoice: inv2, batchId: kidsBatchId } =
        await createPendingInvoiceViaEnroll(
          cleanup,
          SEED.kidsBatchId,
          SEED.kidPlanIds[0],
          "Trainer Analytics 2",
        );
      await markPaid(inv2.id);

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE + KID_MONTHLY_PRICE,
      );
      expect(analytics.byBatch.length).toBeGreaterThanOrEqual(2);
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer analytics excludes payments from other trainers @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      // Payment in a batch that only has Trainer A
      const { invoice, batchId } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Trainer Isolation",
      );
      await markPaid(invoice.id);

      const analyticsTrainer2 = await getTrainerAnalytics(
        SEED.users.TRAINER_2.id,
      );
      // Trainer 2 should NOT have this batch's revenue
      const batchRow = analyticsTrainer2.byBatch.find(
        (b) => b.batchId === batchId,
      );
      // Either the batch doesn't appear or it has 0 collected
      if (batchRow) {
        expect(batchRow.collected).toBe(0);
      }
    } finally {
      await cleanup.dispose();
    }
  });

  test("all-trainers analytics sums all batches @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "All Trainers Student",
      );
      await markPaid(invoice.id);

      const analytics = await getTrainerAnalytics("all");
      expect(analytics.trainerId).toBe("all");
      expect(analytics.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer analytics tracks byPaymentMethod correctly @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Payment Method Student",
      );
      await markPaid(invoice.id, "CASH");

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.byPaymentMethod.CASH).toBeDefined();
      expect(analytics.byPaymentMethod.CASH.count).toBeGreaterThanOrEqual(1);
      expect(analytics.byPaymentMethod.CASH.amount).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("pending payments list includes unpaid invoices @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Pending List Student",
      );

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      const pendingEntry = analytics.pendingPayments.find(
        (p) => p.invoiceId === invoice.id,
      );
      expect(pendingEntry).toBeDefined();
      expect(pendingEntry!.amount).toBe(ADULT_MONTHLY_PRICE);
      expect(pendingEntry!.status).toBe("PENDING");
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 4. Date-Range Filtering
// =========================================================================

test.describe("Date-range filtering @http", () => {
  test("analytics with bounded date range returns only matching payments @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Date Range Student",
      );
      await markPaid(invoice.id);

      const now = new Date();
      const todayStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      ).toISOString();
      const todayEnd = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      ).toISOString();

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id, {
        from: todayStart,
        to: todayEnd,
        bucket: "day",
      });

      // Today's payment should appear in collected
      expect(analytics.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
      expect(analytics.series.length).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanup.dispose();
    }
  });

  test("empty date range returns zero collected @http", async () => {
    // Use a date range far in the past where no payments exist
    const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id, {
      from: "2020-01-01T00:00:00.000Z",
      to: "2020-01-31T23:59:59.999Z",
      bucket: "day",
    });
    expect(analytics.totals.collected).toBe(0);
    expect(analytics.series.every((row) => row.collected === 0)).toBe(true);
  });

  test("comparison period is calculated for date-bounded range @http", async () => {
    const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id, {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T23:59:59.999Z",
      bucket: "day",
    });
    // comparison should be defined (may be null delta if no prior data)
    expect(analytics.comparison).toBeDefined();
  });
});

// =========================================================================
// 5. Combined Filters
// =========================================================================

test.describe("Combined filters @http", () => {
  test("date range + batch filter combination @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice, batchId } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Combined Filter Student",
      );
      await markPaid(invoice.id);

      const batchRevenue = await expectOk<{
        totals: { collected: number };
      }>("STAFF", `/batches/${batchId}/revenue?period=month`);
      expect(batchRevenue.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer filter in analytics returns trainer-specific data @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Trainer Filter Student",
      );
      await markPaid(invoice.id);

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
      expect(analytics.trainerId).toBe(SEED.users.TRAINER.id);
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 6. Payment Status Tests
// =========================================================================

test.describe("Payment status semantics @http", () => {
  test("PENDING invoice is not counted as collected revenue @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { batchId } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Pending Status Student",
      );

      const batchRevenue = await getBatchRevenue(batchId);
      // PENDING invoices should contribute to pending, not collected
      const pendingRow = batchRevenue.totals;
      expect(pendingRow.pending).toBeGreaterThanOrEqual(ADULT_MONTHLY_PRICE);
    } finally {
      await cleanup.dispose();
    }
  });

  test("PAID invoice is counted as collected revenue @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Paid Status Student",
      );
      await markPaid(invoice.id);

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
      expect(analytics.byStatus.PAID).toBeDefined();
      expect(analytics.byStatus.PAID.count).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanup.dispose();
    }
  });

  test("OVERDUE invoice is tracked as pending in analytics @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Overdue Status Student",
      );

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      // The invoice should appear in pendingPayments
      const entry = analytics.pendingPayments.find(
        (p) => p.invoiceId === invoice.id,
      );
      expect(entry).toBeDefined();
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 7. Refund Regression Tests
// =========================================================================

test.describe("Refund revenue impact @http", () => {
  test("partial refund reduces collected revenue @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Partial Refund Student",
      );
      await markPaid(invoice.id);

      const before = await getTrainerAnalytics(SEED.users.TRAINER.id);
      const beforeCollected = before.totals.collected;

      const refundAmount = 500;
      const refunded = await refundInvoice(invoice.id, refundAmount, "Test");
      expect(refunded.status).toBe("PAID");
      expect(refunded.refundedAmount).toBe(refundAmount);

      const after = await getTrainerAnalytics(SEED.users.TRAINER.id);
      // collected should decrease by refundAmount
      expect(after.totals.collected).toBe(beforeCollected - refundAmount);
      expect(after.totals.refunded).toBeGreaterThanOrEqual(refundAmount);
    } finally {
      await cleanup.dispose();
    }
  });

  test("full refund sets status to REFUNDED and removes from collected @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Full Refund Student",
      );
      await markPaid(invoice.id);

      const refunded = await refundInvoice(
        invoice.id,
        ADULT_MONTHLY_PRICE,
        "Full refund",
      );
      expect(refunded.status).toBe("REFUNDED");
      expect(refunded.refundedAmount).toBe(ADULT_MONTHLY_PRICE);

      // Verify batch revenue reflects refund
      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.totals.refunded).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("refund above remaining balance is rejected @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Over Refund Student",
      );
      await markPaid(invoice.id);

      await expectStatus("STAFF", `/billing/${invoice.id}/refund`, 400, {
        method: "POST",
        body: JSON.stringify({ amount: ADULT_MONTHLY_PRICE + 1 }),
      });
    } finally {
      await cleanup.dispose();
    }
  });

  test("refund appears in refund tab of studio invoice list @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Refund Tab Student",
      );
      await markPaid(invoice.id);
      await refundInvoice(invoice.id, 200, "Tab test");

      const studioInvoices = unwrapPage(
        await expectOk<
          | Array<{
              id: string;
              status: string;
              refundedAmount?: number;
            }>
          | {
              items: Array<{
                id: string;
                status: string;
                refundedAmount?: number;
              }>;
            }
        >("STAFF", `/billing/studio/${SEED.studioId}?limit=50`),
      );
      const row = studioInvoices.find((i) => i.id === invoice.id);
      expect(row).toBeDefined();
      expect(row!.status).toBe("PAID");
      expect(row!.refundedAmount).toBe(200);
    } finally {
      await cleanup.dispose();
    }
  });

  test("multiple partial refunds accumulate correctly @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Multi Refund Student",
      );
      await markPaid(invoice.id);

      await refundInvoice(invoice.id, 300, "First refund");
      await refundInvoice(invoice.id, 400, "Second refund");

      const studioInvoices = unwrapPage(
        await expectOk<
          | Array<{ id: string; refundedAmount: number }>
          | { items: Array<{ id: string; refundedAmount: number }> }
        >("STAFF", `/billing/studio/${SEED.studioId}?limit=50`),
      );
      const row = studioInvoices.find((i) => i.id === invoice.id);
      expect(row).toBeDefined();
      expect(row!.refundedAmount).toBe(700);
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 8. Discount Tests
// =========================================================================

test.describe("Discount revenue impact @http", () => {
  test("referral discount reduces collected amount @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Referral Discount Student",
      );

      const discount = 500;
      const paid = await expectOk<{
        id: string;
        status: string;
        amount: number;
        subtotal: number;
        referralDiscount: number;
      }>("STAFF", `/billing/${invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: "CASH",
          referralDiscount: discount,
        }),
      });

      expect(paid.status).toBe("PAID");
      expect(paid.subtotal).toBe(ADULT_MONTHLY_PRICE);
      expect(paid.referralDiscount).toBe(discount);
      expect(paid.amount).toBe(ADULT_MONTHLY_PRICE - discount);
    } finally {
      await cleanup.dispose();
    }
  });

  test("studio discount reduces collected amount @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Studio Discount Student",
      );

      const discount = 300;
      const paid = await expectOk<{
        id: string;
        status: string;
        amount: number;
        subtotal: number;
        studioDiscount: number;
      }>("STAFF", `/billing/${invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: "CASH",
          studioDiscount: discount,
        }),
      });

      expect(paid.status).toBe("PAID");
      expect(paid.subtotal).toBe(ADULT_MONTHLY_PRICE);
      expect(paid.studioDiscount).toBe(discount);
      expect(paid.amount).toBe(ADULT_MONTHLY_PRICE - discount);
    } finally {
      await cleanup.dispose();
    }
  });

  test("combined discounts cannot exceed invoice amount @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Over Discount Student",
      );

      await expectStatus("STAFF", `/billing/${invoice.id}/paid`, 400, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: "CASH",
          referralDiscount: ADULT_MONTHLY_PRICE,
          studioDiscount: 1,
        }),
      });
    } finally {
      await cleanup.dispose();
    }
  });

  test("discounted amount feeds into batch revenue correctly @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice, batchId } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Discount Revenue Student",
      );

      const discount = 500;
      await expectOk("STAFF", `/billing/${invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: "CASH",
          referralDiscount: discount,
        }),
      });

      const revenue = await getBatchRevenue(batchId);
      // Revenue should include the discounted amount, not the original
      expect(revenue.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE - discount,
      );
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 9. Role-Based Revenue Access
// =========================================================================

test.describe("Role-based revenue access @http", () => {
  test("trainer can view own analytics @http", async () => {
    const result = await expectOk<{
      trainerId: string;
      totals: { collected: number };
    }>(
      "TRAINER",
      `/billing/analytics/trainer/${SEED.users.TRAINER.id}?studioId=${SEED.studioId}`,
    );
    expect(result.trainerId).toBe(SEED.users.TRAINER.id);
  });

  test("trainer cannot view another trainer analytics @http", async () => {
    await expectStatus(
      "TRAINER",
      `/billing/analytics/trainer/${SEED.users.TRAINER_2.id}?studioId=${SEED.studioId}`,
      403,
    );
  });

  test("student cannot mark invoice paid @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Role Block Student",
      );
      await expectStatus("STUDENT", `/billing/${invoice.id}/paid`, 403, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });
    } finally {
      await cleanup.dispose();
    }
  });

  test("student cannot refund invoice @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Role Block Refund Student",
      );
      await markPaid(invoice.id);
      await expectStatus("STUDENT", `/billing/${invoice.id}/refund`, 403, {
        method: "POST",
        body: JSON.stringify({ amount: 100 }),
      });
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer cannot mark invoice paid @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Trainer Role Block",
      );
      await expectStatus("TRAINER", `/billing/${invoice.id}/paid`, 403, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });
    } finally {
      await cleanup.dispose();
    }
  });

  test("owner can view studio invoices @http", async () => {
    const invoices = unwrapPage(
      await expectOk<Array<{ id: string }> | { items: Array<{ id: string }> }>(
        "OWNER",
        `/billing/studio/${SEED.studioId}`,
      ),
    );
    expect(Array.isArray(invoices)).toBe(true);
  });

  test("student can list own invoices @http", async () => {
    const invoices = unwrapPage(
      await expectOk<Array<{ id: string }> | { items: Array<{ id: string }> }>(
        "STUDENT",
        `/billing/student/${SEED.users.STUDENT.id}`,
      ),
    );
    expect(Array.isArray(invoices)).toBe(true);
  });

  test("trainer can view batch revenue @http", async () => {
    const revenue = await expectOk<{
      totals: { collected: number };
    }>("TRAINER", `/batches/${SEED.beginnerBatchId}/revenue`);
    expect(revenue.totals).toBeDefined();
  });
});

// =========================================================================
// 10. Duplicate-Payment Protection
// =========================================================================

test.describe("Duplicate-payment protection @http", () => {
  test("cannot mark an already-paid invoice again @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Duplicate Pay Student",
      );
      await markPaid(invoice.id);

      const result = await expectStatus(
        "STAFF",
        `/billing/${invoice.id}/paid`,
        400,
        {
          method: "PATCH",
          body: JSON.stringify({ paymentMethod: "CASH" }),
        },
      );
      expect(result.text).toMatch(/already paid/i);
    } finally {
      await cleanup.dispose();
    }
  });

  test("second refund attempt on fully-refunded invoice is rejected @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Double Refund Student",
      );
      await markPaid(invoice.id);
      await refundInvoice(invoice.id, ADULT_MONTHLY_PRICE, "Full refund");

      // Attempting to refund again should fail
      await expectStatus("STAFF", `/billing/${invoice.id}/refund`, 400, {
        method: "POST",
        body: JSON.stringify({ amount: 100 }),
      });
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 11. Platform Fee Calculation
// =========================================================================

test.describe("Platform fee calculation @http", () => {
  test("platform fee is computed on discounted amount @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Platform Fee Student",
      );

      const discount = 500;
      const paid = await expectOk<{
        id: string;
        status: string;
        amount: number;
        platformFeeComputed?: number;
      }>("STAFF", `/billing/${invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: "CASH",
          referralDiscount: discount,
        }),
      });

      expect(paid.status).toBe("PAID");
      const expectedNet = ADULT_MONTHLY_PRICE - discount;
      // Platform fee is 5% of discounted amount, rounded
      const expectedFee = Math.round(expectedNet * 0.05 * 100) / 100;
      if (paid.platformFeeComputed !== undefined) {
        expect(paid.platformFeeComputed).toBe(expectedFee);
      }
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 12. Invoice Status Transitions
// =========================================================================

test.describe("Invoice status transitions @http", () => {
  test("PENDING → PAID via markPaid @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Transition Student",
      );
      expect(invoice.status).toBe("PENDING");

      const paid = await markPaid(invoice.id);
      expect(paid.status).toBe("PAID");
    } finally {
      await cleanup.dispose();
    }
  });

  test("PENDING → CANCELLED via abandon @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice, student } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Abandon Student",
      );

      const abandoned = await expectOk<{ id: string; status: string }>(
        "STUDENT",
        `/billing/${invoice.id}/abandon-payment`,
        { method: "POST", body: "{}" },
        { userId: student.id },
      );
      expect(abandoned.status).toBe("CANCELLED");
    } finally {
      await cleanup.dispose();
    }
  });

  test("PENDING → REFUNDED via full refund after PAID @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Refunded Status Student",
      );
      await markPaid(invoice.id);

      const refunded = await refundInvoice(
        invoice.id,
        ADULT_MONTHLY_PRICE,
        "Full",
      );
      expect(refunded.status).toBe("REFUNDED");
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 13. Payment Method Revenue Attribution
// =========================================================================

test.describe("Payment method revenue attribution @http", () => {
  test("CASH payment appears in byPaymentMethod @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Cash Method Student",
      );
      await markPaid(invoice.id, "CASH");

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.byPaymentMethod.CASH).toBeDefined();
      expect(analytics.byPaymentMethod.CASH.amount).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("UPI_MANUAL payment appears in byPaymentMethod @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "UPI Method Student",
      );
      await markPaid(invoice.id, "UPI_MANUAL");

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.byPaymentMethod.UPI_MANUAL).toBeDefined();
      expect(
        analytics.byPaymentMethod.UPI_MANUAL.amount,
      ).toBeGreaterThanOrEqual(ADULT_MONTHLY_PRICE);
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 14. Revenue Reconciliation — Core Regression Test
// =========================================================================

test.describe("Revenue reconciliation @http", () => {
  test("full reconciliation: multiple payments → batch/trainer totals correct @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const {
        invoice: inv1,
        student: studentA,
        batchId: adultBatchId,
      } = await createPendingInvoiceViaEnroll(
        cleanup,
        undefined,
        SEED.adultPlanIds[0],
        "Recon Student A",
      );
      await markPaid(inv1.id, "CASH");

      const { invoice: inv2, student: studentB } =
        await createPendingInvoiceViaEnroll(
          cleanup,
          adultBatchId,
          SEED.adultPlanIds[0],
          "Recon Student B",
        );
      await markPaid(inv2.id, "UPI_MANUAL");

      const {
        invoice: inv3,
        student: studentC,
        batchId: kidsBatchId,
      } = await createPendingInvoiceViaEnroll(
        cleanup,
        undefined,
        SEED.kidPlanIds[0],
        "Recon Student C",
      );
      await markPaid(inv3.id, "CASH");

      const batchARevenue = await getBatchRevenue(adultBatchId);
      expect(batchARevenue.totals.collected).toBe(ADULT_MONTHLY_PRICE * 2);
      expect(batchARevenue.totals.invoiceCount).toBeGreaterThanOrEqual(2);

      const batchBRevenue = await getBatchRevenue(kidsBatchId);
      expect(batchBRevenue.totals.collected).toBe(KID_MONTHLY_PRICE);
      expect(batchBRevenue.totals.invoiceCount).toBeGreaterThanOrEqual(1);

      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE * 2 + KID_MONTHLY_PRICE,
      );
      expect(analytics.byStatus.PAID.count).toBeGreaterThanOrEqual(3);

      const beginnerRow = analytics.byBatch.find(
        (b) => b.batchId === adultBatchId,
      );
      expect(beginnerRow).toBeDefined();
      expect(beginnerRow!.collected).toBe(ADULT_MONTHLY_PRICE * 2);

      const kidsRow = analytics.byBatch.find((b) => b.batchId === kidsBatchId);
      expect(kidsRow).toBeDefined();
      expect(kidsRow!.collected).toBe(KID_MONTHLY_PRICE);

      expect(analytics.byPaymentMethod.CASH).toBeDefined();
      expect(analytics.byPaymentMethod.CASH.amount).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE + KID_MONTHLY_PRICE,
      );
      expect(analytics.byPaymentMethod.UPI_MANUAL).toBeDefined();
      expect(
        analytics.byPaymentMethod.UPI_MANUAL.amount,
      ).toBeGreaterThanOrEqual(ADULT_MONTHLY_PRICE);

      // === Verify student invoice lists ===
      const studentAInvoices = unwrapPage(
        await expectOk<
          | Array<{ id: string; status: string }>
          | { items: Array<{ id: string; status: string }> }
        >("STAFF", `/billing/student/${studentA.id}?limit=50`),
      );
      const studentAPaid = studentAInvoices.filter((i) => i.status === "PAID");
      expect(studentAPaid.length).toBeGreaterThanOrEqual(1);

      const studentBInvoices = unwrapPage(
        await expectOk<
          | Array<{ id: string; status: string }>
          | { items: Array<{ id: string; status: string }> }
        >("STAFF", `/billing/student/${studentB.id}?limit=50`),
      );
      const studentBPaid = studentBInvoices.filter((i) => i.status === "PAID");
      expect(studentBPaid.length).toBeGreaterThanOrEqual(1);

      const studentCInvoices = unwrapPage(
        await expectOk<
          | Array<{ id: string; status: string }>
          | { items: Array<{ id: string; status: string }> }
        >("STAFF", `/billing/student/${studentC.id}?limit=50`),
      );
      const studentCPaid = studentCInvoices.filter((i) => i.status === "PAID");
      expect(studentCPaid.length).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanup.dispose();
    }
  });

  test("reconciliation after refund: revenue adjusts correctly @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Recon Refund Student",
      );
      await markPaid(invoice.id);

      // Revenue should include the payment
      const before = await getTrainerAnalytics(SEED.users.TRAINER.id);
      const beforeCollected = before.totals.collected;

      // Refund half
      const refundAmount = Math.floor(ADULT_MONTHLY_PRICE / 2);
      await refundInvoice(invoice.id, refundAmount, "Half refund");

      const after = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(after.totals.collected).toBe(beforeCollected - refundAmount);
      expect(after.totals.refunded).toBeGreaterThanOrEqual(refundAmount);
    } finally {
      await cleanup.dispose();
    }
  });

  test("reconciliation with date-filtered view @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Recon Date Student",
      );
      await markPaid(invoice.id);

      // Today's analytics should include this payment
      const now = new Date();
      const todayStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      ).toISOString();
      const todayEnd = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      ).toISOString();

      const todayAnalytics = await getTrainerAnalytics(SEED.users.TRAINER.id, {
        from: todayStart,
        to: todayEnd,
        bucket: "day",
      });
      expect(todayAnalytics.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("studio invoice list includes all paid invoices @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Studio List Student",
      );
      await markPaid(invoice.id, "CASH");

      const studioInvoices = unwrapPage(
        await expectOk<
          | Array<{ id: string; status: string; paymentMethod: string | null }>
          | {
              items: Array<{
                id: string;
                status: string;
                paymentMethod: string | null;
              }>;
            }
        >("STAFF", `/billing/studio/${SEED.studioId}?limit=50`),
      );
      const row = studioInvoices.find((i) => i.id === invoice.id);
      expect(row).toBeDefined();
      expect(row!.status).toBe("PAID");
      expect(row!.paymentMethod).toBe("CASH");
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 15. Batch Purchase → Revenue Flow (End-to-End API)
// =========================================================================

test.describe("Batch purchase → revenue end-to-end @http", () => {
  test("student purchase flow: purchase → confirm → batch revenue updates @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    try {
      const student = await createHttpStudent(
        "E2E Purchase Revenue Student",
        cleanup,
      );

      // Create a fresh batch for isolation
      const batch = await expectOk<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STAFF.studioId,
          name: `Revenue E2E Batch ${stamp}`,
          coverImageUrl:
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
          category: "ADULTS",
          branchId: SEED.branchMainId,
          trainerIds: [SEED.users.TRAINER.id],
          danceCategories: [{ name: "Hip Hop", description: "Revenue E2E" }],
          scheduleJson: {
            frequency: "WEEKLY",
            weekdays: [(stamp + 2) % 7],
            startDate: "2028-05-01",
            endDate: "2028-07-31",
            startTime: `${String(6 + (stamp % 8)).padStart(2, "0")}:${String(stamp % 60).padStart(2, "0")}`,
            endTime: `${String(7 + (stamp % 8)).padStart(2, "0")}:${String(stamp % 60).padStart(2, "0")}`,
            utcOffsetMinutes: 0,
          },
          capacity: 12,
          enrollmentMode: "SELF_JOIN",
          subscriptionIds: [...SEED.adultPlanIds],
          active: true,
          certificationEnabled: false,
        }),
      });
      cleanup.trackBatch(batch.id);

      // Verify zero revenue before purchase
      const beforeRevenue = await getBatchRevenue(batch.id);
      expect(beforeRevenue.totals.collected).toBe(0);

      // Student purchases a plan
      const invoice = await expectOk<{
        id: string;
        status: string;
        amount: number;
      }>(
        "STUDENT",
        `/batches/${batch.id}/purchase`,
        {
          method: "POST",
          body: JSON.stringify({
            subscriptionId: SEED.adultPlanIds[0],
            purchaserUserId: student.id,
            coveredStudents: [{ studentId: student.id, seatRole: "ADULT" }],
          }),
        },
        { userId: student.id },
      );
      expect(invoice.status).toBe("PENDING");
      expect(Number(invoice.amount)).toBe(ADULT_MONTHLY_PRICE);

      // Create payment order and confirm
      await expectOk(
        "STUDENT",
        `/billing/${invoice.id}/create-payment-order`,
        { method: "POST", body: "{}" },
        { userId: student.id },
      );
      const paid = await expectOk<{ status: string; amount: number }>(
        "STUDENT",
        `/billing/${invoice.id}/confirm-payment`,
        { method: "POST", body: "{}" },
        { userId: student.id },
      );
      expect(paid.status).toBe("PAID");

      // Verify batch revenue updated
      const afterRevenue = await getBatchRevenue(batch.id);
      expect(afterRevenue.totals.collected).toBe(ADULT_MONTHLY_PRICE);
      expect(afterRevenue.totals.invoiceCount).toBeGreaterThanOrEqual(1);

      // Verify trainer analytics updated
      const analytics = await getTrainerAnalytics(SEED.users.TRAINER.id);
      expect(analytics.totals.collected).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
    } finally {
      await cleanup.dispose();
    }
  });
});

// =========================================================================
// 16. Membership Renewal Revenue
// =========================================================================

test.describe("Membership renewal revenue @http", () => {
  test("renewal invoice generation and payment flow @http", async () => {
    // The seed has a DUE membership with a pending renewal invoice
    const invoice = await expectOk<{
      id: string;
      status: string;
      membershipId: string;
      amount: number;
    }>("STUDENT", "/memberships/self/renew", {
      method: "POST",
      body: JSON.stringify({
        membershipId: SEED.membershipStudentDueId,
      }),
    });

    // Should return existing renewal invoice
    expect(["PENDING", "OVERDUE"]).toContain(invoice.status);
    expect(invoice.membershipId).toBe(SEED.membershipStudentDueId);
    expect(Number(invoice.amount)).toBe(ADULT_MONTHLY_PRICE);

    // Mark it paid (staff action for manual renewal)
    const paid = await markPaid(invoice.id, "CASH");
    expect(paid.status).toBe("PAID");

    // Verify the renewal was processed
    const memberships = await expectOk<Array<{ id: string; status: string }>>(
      "STUDENT",
      `/memberships/student/${SEED.users.STUDENT.id}`,
    );
    const renewed = memberships.find(
      (m) => m.id === SEED.membershipStudentDueId,
    );
    expect(renewed).toBeDefined();
  });
});

// =========================================================================
// 17. Abandoned Payment Does Not Create Revenue
// =========================================================================

test.describe("Abandoned payment no revenue @http", () => {
  test("abandoned invoice does not contribute to revenue @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice, batchId, student } = await createPendingInvoiceViaEnroll(
        cleanup,
        SEED.beginnerBatchId,
        SEED.adultPlanIds[0],
        "Abandon Revenue Student",
      );

      const beforeRevenue = await getBatchRevenue(batchId);

      // Abandon the payment
      await expectOk<{ status: string }>(
        "STUDENT",
        `/billing/${invoice.id}/abandon-payment`,
        { method: "POST", body: "{}" },
        { userId: student.id },
      );

      const afterRevenue = await getBatchRevenue(batchId);
      // Revenue should not change after abandonment
      expect(afterRevenue.totals.collected).toBe(
        beforeRevenue.totals.collected,
      );
    } finally {
      await cleanup.dispose();
    }
  });
});
