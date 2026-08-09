import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import {
  createHttpStudent,
  expectOk,
  expectStatus,
  TestDataCleanup,
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
    const invoices = await expectOk<Array<{ id: string }>>(
      "STUDENT",
      `/billing/student/${SEED.users.STUDENT.id}`,
    );
    expect(Array.isArray(invoices)).toBe(true);
  });
});
