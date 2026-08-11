import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import {
  createHttpStudent,
  expectOk,
  expectStatus,
  TestDataCleanup,
  unwrapPage,
} from "./helpers";

/** Adult monthly plan price from seed-e2e (e2e-sub-individual-adult-monthly). */
const ADULT_MONTHLY_PRICE = 3500;

async function createPendingInvoiceViaEnroll(cleanup: TestDataCleanup) {
  const student = await createHttpStudent("Billing Invoice Student", cleanup);
  const enrollment = await expectOk<{
    invoice: { id: string; status: string; amount: number };
  }>("STAFF", `/batches/${SEED.beginnerBatchId}/enroll`, {
    method: "POST",
    body: JSON.stringify({
      studentId: student.id,
      subscriptionId: SEED.adultPlanIds[0],
    }),
  });
  return enrollment.invoice;
}

test.describe("billing HTTP @http", () => {
  test("manual create invoice endpoint is removed @http", async () => {
    await expectStatus("STAFF", "/billing", 404, {
      method: "POST",
      body: JSON.stringify({
        studioId: SEED.users.STAFF.studioId,
        studentId: SEED.users.STUDENT.id,
        amount: 2200,
      }),
    });
  });

  test("staff marks unpaid invoice paid @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const target = await createPendingInvoiceViaEnroll(cleanup);
      expect(target.status).toBe("PENDING");

      const paid = await expectOk<{ id: string; status: string }>(
        "STAFF",
        `/billing/${target.id}/paid`,
        {
          method: "PATCH",
          body: JSON.stringify({ paymentMethod: "CASH" }),
        },
      );
      expect(paid.status).toBe("PAID");
    } finally {
      await cleanup.dispose();
    }
  });

  test("staff marks invoice paid with discounts @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const target = await createPendingInvoiceViaEnroll(cleanup);
      expect(target.status).toBe("PENDING");
      expect(Number(target.amount)).toBe(ADULT_MONTHLY_PRICE);

      const paid = await expectOk<{
        id: string;
        status: string;
        amount: number;
        referralDiscount: number;
        studioDiscount: number;
        subtotal: number;
      }>("STAFF", `/billing/${target.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: "UPI_MANUAL",
          referralDiscount: 200,
          studioDiscount: 100,
        }),
      });
      expect(paid.status).toBe("PAID");
      expect(paid.subtotal).toBe(ADULT_MONTHLY_PRICE);
      expect(paid.referralDiscount).toBe(200);
      expect(paid.studioDiscount).toBe(100);
      expect(paid.amount).toBe(ADULT_MONTHLY_PRICE - 300);
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer cannot mark invoice paid @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const target = await createPendingInvoiceViaEnroll(cleanup);
      await expectStatus("TRAINER", `/billing/${target.id}/paid`, 403, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });
    } finally {
      await cleanup.dispose();
    }
  });

  test("student cannot mark invoice paid @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const target = await createPendingInvoiceViaEnroll(cleanup);
      await expectStatus("STUDENT", `/billing/${target.id}/paid`, 403, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });
    } finally {
      await cleanup.dispose();
    }
  });

  test("staff cannot mark an already-paid invoice again @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const target = await createPendingInvoiceViaEnroll(cleanup);
      await expectOk("STAFF", `/billing/${target.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });
      const result = await expectStatus(
        "STAFF",
        `/billing/${target.id}/paid`,
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

  test("staff issues a partial refund on a paid invoice @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const target = await createPendingInvoiceViaEnroll(cleanup);
      await expectOk("STAFF", `/billing/${target.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });

      const refunded = await expectOk<{
        id: string;
        status: string;
        amount: number;
        refundedAmount: number;
        thisRefundAmount: number;
      }>("STAFF", `/billing/${target.id}/refund`, {
        method: "POST",
        body: JSON.stringify({ amount: 500, reason: "Partial month" }),
      });

      expect(refunded.status).toBe("PAID");
      expect(refunded.refundedAmount).toBe(500);
      expect(refunded.thisRefundAmount).toBe(500);
    } finally {
      await cleanup.dispose();
    }
  });

  test("staff refund above remaining balance is rejected @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const target = await createPendingInvoiceViaEnroll(cleanup);
      await expectOk("STAFF", `/billing/${target.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });

      await expectStatus("STAFF", `/billing/${target.id}/refund`, 400, {
        method: "POST",
        body: JSON.stringify({ amount: target.amount + 1 }),
      });
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer cannot refund via billing endpoint @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const target = await createPendingInvoiceViaEnroll(cleanup);
      await expectOk("STAFF", `/billing/${target.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });
      await expectStatus("TRAINER", `/billing/${target.id}/refund`, 403, {
        method: "POST",
        body: JSON.stringify({ amount: 100 }),
      });
    } finally {
      await cleanup.dispose();
    }
  });

  test("student lists own invoices @http", async () => {
    const invoices = unwrapPage(
      await expectOk<
        | Array<{ id: string }>
        | { items: Array<{ id: string }>; nextCursor: string | null }
      >("STUDENT", `/billing/student/${SEED.users.STUDENT.id}`),
    );
    expect(Array.isArray(invoices)).toBe(true);
  });

  test("studio invoice list includes batchName @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const target = await createPendingInvoiceViaEnroll(cleanup);
      const invoices = unwrapPage(
        await expectOk<
          | Array<{
              id: string;
              batchId: string | null;
              batchName: string | null;
            }>
          | {
              items: Array<{
                id: string;
                batchId: string | null;
                batchName: string | null;
              }>;
              nextCursor: string | null;
            }
        >("STAFF", `/billing/studio/${SEED.users.STAFF.studioId}?limit=50`),
      );
      const row = invoices.find((invoice) => invoice.id === target.id);
      expect(row?.batchId).toBe(SEED.beginnerBatchId);
      expect(row?.batchName).toBe("E2E Adult Beginner");
    } finally {
      await cleanup.dispose();
    }
  });

  test("student batch purchase payment is counted in batch revenue @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    try {
      const student = await createHttpStudent(
        "Batch Purchase Revenue Student",
        cleanup,
      );
      const batch = await expectOk<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STAFF.studioId,
          name: `HTTP Student Pay Rev ${stamp}`,
          coverImageUrl:
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
          category: "ADULTS",
          branchId: SEED.branchMainId,
          trainerIds: [SEED.users.TRAINER.id],
          danceCategories: [
            { name: "Hip Hop", description: "Student purchase revenue" },
          ],
          scheduleJson: {
            frequency: "WEEKLY",
            weekdays: [stamp % 7],
            startDate: "2028-01-03",
            endDate: "2028-03-27",
            startTime: `${String(6 + (stamp % 8)).padStart(2, "0")}:${String(stamp % 60).padStart(2, "0")}`,
            endTime: `${String(7 + (stamp % 8)).padStart(2, "0")}:${String(stamp % 60).padStart(2, "0")}`,
            utcOffsetMinutes: 0,
          },
          capacity: 8,
          enrollmentMode: "SELF_JOIN",
          subscriptionIds: [...SEED.adultPlanIds],
          active: true,
          certificationEnabled: false,
        }),
      });
      cleanup.trackBatch(batch.id);

      const before = await expectOk<{
        totals: { collected: number; invoiceCount: number };
      }>("STAFF", `/batches/${batch.id}/revenue`);
      expect(before.totals.collected).toBe(0);

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
            coveredStudents: [
              { studentId: student.id, seatRole: "ADULT" },
            ],
          }),
        },
        { userId: student.id },
      );
      expect(invoice.status).toBe("PENDING");
      expect(Number(invoice.amount)).toBe(ADULT_MONTHLY_PRICE);

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

      const after = await expectOk<{
        totals: { collected: number; invoiceCount: number };
      }>("STAFF", `/batches/${batch.id}/revenue`);
      expect(after.totals.collected).toBe(Number(invoice.amount));
      expect(after.totals.invoiceCount).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanup.dispose();
    }
  });

  test("batch revenue ignores payments attributed to another batch for shared students @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    try {
      const student = await createHttpStudent(
        "Shared Batch Revenue Student",
        cleanup,
      );
      const batch2 = await expectOk<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.users.STAFF.studioId,
          name: `HTTP Revenue Batch ${stamp}`,
          coverImageUrl:
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
          category: "ADULTS",
          branchId: SEED.branchMainId,
          trainerIds: [SEED.users.TRAINER.id],
          danceCategories: [
            { name: "Hip Hop", description: "Revenue isolation batch" },
          ],
          scheduleJson: {
            frequency: "WEEKLY",
            weekdays: [(stamp + 3) % 7],
            startDate: "2028-04-03",
            endDate: "2028-06-26",
            startTime: `${String(8 + (stamp % 6)).padStart(2, "0")}:${String((stamp * 7) % 60).padStart(2, "0")}`,
            endTime: `${String(9 + (stamp % 6)).padStart(2, "0")}:${String((stamp * 7) % 60).padStart(2, "0")}`,
            utcOffsetMinutes: 0,
          },
          capacity: 8,
          enrollmentMode: "SELF_JOIN",
          subscriptionIds: [...SEED.adultPlanIds],
          active: true,
          certificationEnabled: false,
        }),
      });
      cleanup.trackBatch(batch2.id);

      const batch1Enroll = await expectOk<{
        invoice: { id: string; amount: number; status: string };
      }>("STAFF", `/batches/${SEED.beginnerBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });
      expect(batch1Enroll.invoice.status).toBe("PENDING");

      await expectOk("STAFF", `/billing/${batch1Enroll.invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });

      await expectOk("STAFF", `/batches/${batch2.id}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });

      const batch1Revenue = await expectOk<{
        totals: { collected: number; invoiceCount: number };
      }>("STAFF", `/batches/${SEED.beginnerBatchId}/revenue`);
      const batch2Revenue = await expectOk<{
        totals: { collected: number; invoiceCount: number };
      }>("STAFF", `/batches/${batch2.id}/revenue`);

      expect(batch1Revenue.totals.collected).toBeGreaterThanOrEqual(
        Number(batch1Enroll.invoice.amount),
      );
      expect(batch2Revenue.totals.collected).toBe(0);
    } finally {
      await cleanup.dispose();
    }
  });
});
