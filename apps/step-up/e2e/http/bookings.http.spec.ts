import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import {
  createHttpStudent,
  expectOk,
  expectStatus,
  TestDataCleanup,
} from "./helpers";

const TRIAL_SESSION_ID = SEED.trialSessionId;

async function clearOpenTrialBookings(studentId: string, sessionId: string) {
  const existing = await expectOk<
    Array<{ id: string; status: string; sessionId: string | null }>
  >("STUDENT", `/bookings/student/${studentId}`, undefined, {
    userId: studentId,
  });

  for (const booking of existing) {
    if (booking.sessionId !== sessionId) continue;
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

  test("student creates free trial booking for a session @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("Booking Trial Student", cleanup);
      const studentId = student.id;
      await clearOpenTrialBookings(studentId, TRIAL_SESSION_ID);

      const created = await expectOk<{
        id: string;
        status: string;
        sessionId: string | null;
      }>(
        "STUDENT",
        "/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            studioId: SEED.users.STUDENT.studioId,
            studentId,
            type: "TRIAL",
            sessionId: TRIAL_SESSION_ID,
          }),
        },
        { userId: studentId },
      );

      expect(created.id).toBeTruthy();
      expect(created.sessionId).toBe(TRIAL_SESSION_ID);
      expect(created.status).toBe("PENDING");
    } finally {
      await cleanup.dispose();
    }
  });

  test("student cannot create duplicate trial for same session @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent(
        "Booking Duplicate Trial",
        cleanup,
      );
      const studentId = student.id;
      await clearOpenTrialBookings(studentId, TRIAL_SESSION_ID);

      await expectOk(
        "STUDENT",
        "/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            studioId: SEED.users.STUDENT.studioId,
            studentId,
            type: "TRIAL",
            sessionId: TRIAL_SESSION_ID,
          }),
        },
        { userId: studentId },
      );

      const conflict = await expectStatus(
        "STUDENT",
        "/bookings",
        409,
        {
          method: "POST",
          body: JSON.stringify({
            studioId: SEED.users.STUDENT.studioId,
            studentId,
            type: "TRIAL",
            sessionId: TRIAL_SESSION_ID,
          }),
        },
        { userId: studentId },
      );
      expect(conflict.status).toBe(409);
    } finally {
      await cleanup.dispose();
    }
  });
});
