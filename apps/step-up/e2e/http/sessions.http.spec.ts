import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

test.describe("sessions schedule HTTP @http", () => {
  test("trainer can create, reschedule, and cancel a session @http", async () => {
    // Quiet UTC hour + unique far-future day avoids collisions with seeded
    // weekly sessions and leftovers from prior timed-out creates.
    const dayOffset = 50 + Math.floor(Math.random() * 40);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + dayOffset);
    start.setUTCHours(2, Math.floor(Math.random() * 50), Math.floor(Math.random() * 50), 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const created = await expectOk<{
      id: string;
      status: string;
      startsAt: string;
    }>("TRAINER", "/sessions", {
      method: "POST",
      body: JSON.stringify({
        batchId: SEED.kidsBatchId,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        type: "REGULAR",
      }),
    });
    expect(created.status).toBe("SCHEDULED");

    try {
      const movedStart = new Date(start.getTime() + 15 * 60 * 1000);
      const movedEnd = new Date(movedStart.getTime() + 60 * 60 * 1000);

      const updated = await expectOk<{ startsAt: string; endsAt: string }>(
        "TRAINER",
        `/sessions/${created.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            startsAt: movedStart.toISOString(),
            endsAt: movedEnd.toISOString(),
          }),
        },
      );
      expect(new Date(updated.startsAt).toISOString()).toBe(
        movedStart.toISOString(),
      );

      const cancelled = await expectOk<{ status: string }>(
        "TRAINER",
        `/sessions/${created.id}`,
        { method: "DELETE" },
      );
      expect(cancelled.status).toBe("CANCELLED");
    } catch (error) {
      await expectOk("TRAINER", `/sessions/${created.id}`, {
        method: "DELETE",
      }).catch(() => undefined);
      throw error;
    }
  });

  test("student cannot reschedule or delete sessions @http", async () => {
    await expectStatus("STUDENT", `/sessions/${SEED.sessionAttendanceId}`, 403, {
      method: "PATCH",
      body: JSON.stringify({
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      }),
    });
    await expectStatus(
      "STUDENT",
      `/sessions/${SEED.sessionAttendanceId}`,
      403,
      { method: "DELETE" },
    );
  });

  test("completed sessions cannot be deleted @http", async () => {
    await expectStatus(
      "TRAINER",
      `/sessions/${SEED.sessionAttendancePastId}`,
      400,
      { method: "DELETE" },
    );
  });
});
