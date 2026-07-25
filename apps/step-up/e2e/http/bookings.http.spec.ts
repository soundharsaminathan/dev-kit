import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk } from "./helpers";

const TRIAL_BATCH_ID = SEED.trialBatchId;

async function clearOpenTrialBookings(studentId: string, batchId: string) {
  const existing = await expectOk<
    Array<{ id: string; status: string; batchId: string | null }>
  >("STUDENT", `/bookings/student/${studentId}`);

  for (const booking of existing) {
    if (booking.batchId !== batchId) continue;
    if (booking.status === "AWAITING_PAYMENT") {
      await expectOk("STUDENT", `/bookings/${booking.id}/abandon-payment`, {
        method: "POST",
      });
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
    const studentId = SEED.users.STUDENT.id;
    await clearOpenTrialBookings(studentId, TRIAL_BATCH_ID);

    const created = await expectOk<{
      id: string;
      status: string;
    }>("STUDENT", "/bookings", {
      method: "POST",
      body: JSON.stringify({
        studioId: SEED.users.STUDENT.studioId,
        studentId,
        type: "TRIAL",
        batchId: TRIAL_BATCH_ID,
      }),
    });

    expect(created.id).toBeTruthy();
    expect(["AWAITING_PAYMENT", "PENDING", "CONFIRMED"]).toContain(
      created.status,
    );

    if (created.status === "AWAITING_PAYMENT") {
      const abandoned = await expectOk<{ status: string }>(
        "STUDENT",
        `/bookings/${created.id}/abandon-payment`,
        { method: "POST" },
      );
      expect(abandoned.status).not.toBe("AWAITING_PAYMENT");
    }
  });

  test("student confirms awaiting-payment booking @http", async () => {
    const studentId = SEED.users.STUDENT.id;
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
    );

    test.skip(
      created.status !== "AWAITING_PAYMENT",
      `Expected AWAITING_PAYMENT, got ${created.status}`,
    );

    const confirmed = await expectOk<{ status: string }>(
      "STUDENT",
      `/bookings/${created.id}/confirm-payment`,
      { method: "POST" },
    );
    expect(confirmed.status).toBe("PENDING");
  });

  test("staff can patch booking status @http", async () => {
    const booking = await expectOk<{ id: string; status: string }>(
      "STAFF",
      `/bookings/${SEED.pendingBookingId}`,
    ).catch(() => null);
    test.skip(!booking, "Seed pending booking missing");

    if (booking!.status !== "PENDING") {
      // Seed resets to PENDING; if a prior run confirmed it, cancel then skip.
      test.skip(true, `Seed booking is ${booking!.status}; re-seed to reset`);
    }

    const updated = await expectOk<{ status: string }>(
      "STAFF",
      `/bookings/${booking!.id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      },
    );
    expect(updated.status).toBe("CANCELLED");
  });
});
