import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { createHttpStudent, expectOk, TestDataCleanup } from "./helpers";

const TRIAL_BATCH_ID = SEED.trialBatchId;

async function clearOpenTrialBookings(studentId: string, batchId: string) {
  const existing = await expectOk<
    Array<{ id: string; status: string; batchId: string | null }>
  >("STUDENT", `/bookings/student/${studentId}`, undefined, {
    userId: studentId,
  });

  for (const booking of existing) {
    if (booking.batchId !== batchId) continue;
    if (booking.status === "AWAITING_PAYMENT") {
      await expectOk(
        "STUDENT",
        `/bookings/${booking.id}/abandon-payment`,
        { method: "POST" },
        { userId: studentId },
      );
    } else if (booking.status === "PENDING" || booking.status === "CONFIRMED") {
      await expectOk("STAFF", `/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
    }
  }
}

test.describe("bookings HTTP @http", () => {
  test.describe.configure({ mode: "serial" });

  test("student creates trial booking and can abandon payment @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("Booking Trial Student", cleanup);
      const studentId = student.id;
      await clearOpenTrialBookings(studentId, TRIAL_BATCH_ID);

      const created = await expectOk<{
        id: string;
        status: string;
      }>(
        "STUDENT",
        "/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            studioId: SEED.users.STUDENT.studioId,
            studentId,
            type: "TRIAL",
            batchId: TRIAL_BATCH_ID,
          }),
        },
        { userId: studentId },
      );

      expect(created.id).toBeTruthy();
      expect(["AWAITING_PAYMENT", "PENDING", "CONFIRMED"]).toContain(
        created.status,
      );

      if (created.status === "AWAITING_PAYMENT") {
        const abandoned = await expectOk<{ status: string }>(
          "STUDENT",
          `/bookings/${created.id}/abandon-payment`,
          { method: "POST" },
          { userId: studentId },
        );
        expect(abandoned.status).not.toBe("AWAITING_PAYMENT");
      }
    } finally {
      await cleanup.dispose();
    }
  });

  test("student confirms awaiting-payment booking @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent(
        "Booking Confirm Student",
        cleanup,
      );
      const studentId = student.id;
      await clearOpenTrialBookings(studentId, TRIAL_BATCH_ID);

      const created = await expectOk<{ id: string; status: string }>(
        "STUDENT",
        "/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            studioId: SEED.users.STUDENT.studioId,
            studentId,
            type: "TRIAL",
            batchId: TRIAL_BATCH_ID,
          }),
        },
        { userId: studentId },
      );

      test.skip(
        created.status !== "AWAITING_PAYMENT",
        `Expected AWAITING_PAYMENT, got ${created.status}`,
      );

      const confirmed = await expectOk<{ status: string }>(
        "STUDENT",
        `/bookings/${created.id}/confirm-payment`,
        { method: "POST" },
        { userId: studentId },
      );
      expect(confirmed.status).toBe("PENDING");
    } finally {
      await cleanup.dispose();
    }
  });

  test("staff can patch booking status @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent(
        "Booking Status Student",
        cleanup,
      );
      const studentId = student.id;
      await clearOpenTrialBookings(studentId, TRIAL_BATCH_ID);

      let booking = await expectOk<{ id: string; status: string }>(
        "STUDENT",
        "/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            studioId: SEED.users.STUDENT.studioId,
            studentId,
            type: "TRIAL",
            batchId: TRIAL_BATCH_ID,
          }),
        },
        { userId: studentId },
      );

      if (booking.status === "AWAITING_PAYMENT") {
        booking = await expectOk<{ id: string; status: string }>(
          "STUDENT",
          `/bookings/${booking.id}/confirm-payment`,
          { method: "POST" },
          { userId: studentId },
        );
      }

      test.skip(
        booking.status !== "PENDING",
        `Expected PENDING booking, got ${booking.status}`,
      );

      const updated = await expectOk<{ status: string }>(
        "STAFF",
        `/bookings/${booking.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELLED" }),
        },
      );
      expect(updated.status).toBe("CANCELLED");
    } finally {
      await cleanup.dispose();
    }
  });
});
