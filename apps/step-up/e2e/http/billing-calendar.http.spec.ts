import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import {
  createFutureScheduleBatch,
  createHttpStudent,
  createPendingInvoiceViaEnroll,
  expectOk,
  expectStatus,
  TestDataCleanup,
} from "./helpers";

test.describe("billing calendar HTTP @http", () => {
  test("mid-month enroll on a seed batch creates no invoice @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("Calendar Postpaid", cleanup);
      const enrollment = await expectOk<{
        invoice: { id: string } | null;
        billingKind?: string;
      }>("STAFF", `/batches/${SEED.kidsBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.kidPlanIds[0],
        }),
      });
      expect(enrollment.invoice).toBeNull();
      expect(enrollment.billingKind).toBe("postpaid");
    } finally {
      await cleanup.dispose();
    }
  });

  test("prepaid-at-join invoice cannot convert to quarterly @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await createPendingInvoiceViaEnroll(cleanup);
      const result = await expectStatus(
        "STAFF",
        `/billing/${invoice.id}/convert-quarterly`,
        400,
        { method: "POST", body: "{}" },
      );
      expect(result.text).toMatch(/first-month bill/i);
    } finally {
      await cleanup.dispose();
    }
  });

  test("unenroll then enroll a different batch same month keeps the invoice @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { student, invoice, batchId } =
        await createPendingInvoiceViaEnroll(cleanup);
      const other = await createFutureScheduleBatch(cleanup, {
        name: `Calendar Switch Dest ${Date.now()}`,
      });

      await expectOk("STAFF", `/batches/${batchId}/unenroll`, {
        method: "POST",
        body: JSON.stringify({ studentId: student.id }),
      });

      const second = await expectOk<{
        invoice: { id: string } | null;
        billingKind?: string;
      }>("STAFF", `/batches/${other.id}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });
      expect(second.billingKind).toBe("switch");
      expect(second.invoice).toBeNull();

      const kept = await expectOk<{ id: string; status: string }>(
        "STAFF",
        `/billing/${invoice.id}`,
      );
      expect(kept.status).toBe("PENDING");
    } finally {
      await cleanup.dispose();
    }
  });

  test("same-batch rejoin after unenroll is a new joiner @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const batch = await createFutureScheduleBatch(cleanup);
      const student = await createHttpStudent("Calendar Rejoin", cleanup);
      const first = await expectOk<{
        invoice: { id: string; status: string } | null;
        billingKind?: string;
      }>("STAFF", `/batches/${batch.id}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });
      expect(first.billingKind).toBe("prepaid");
      expect(first.invoice?.status).toBe("PENDING");

      await expectOk("STAFF", `/batches/${batch.id}/unenroll`, {
        method: "POST",
        body: JSON.stringify({ studentId: student.id }),
      });

      const second = await expectOk<{
        invoice: { id: string } | null;
        billingKind?: string;
      }>("STAFF", `/batches/${batch.id}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });
      expect(second.billingKind).toBe("prepaid");
      expect(second.invoice?.id).toBeTruthy();
      expect(second.invoice?.id).not.toBe(first.invoice?.id);
    } finally {
      await cleanup.dispose();
    }
  });
});
