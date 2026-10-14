import { expect, test } from "@playwright/test";
import { isScheduleConflict } from "../fixtures/billing-calendar";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

test.describe("sessions schedule HTTP @http", () => {
  test("trainer can create, reschedule, and cancel a session @http", async () => {
    // Quiet UTC hour + unique far-future day avoids collisions with seeded
    // weekly sessions and leftovers from prior timed-out creates.
    const dayOffset = 50 + Math.floor(Math.random() * 40);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + dayOffset);
    start.setUTCHours(
      2,
      Math.floor(Math.random() * 50),
      Math.floor(Math.random() * 50),
      0,
    );
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
    await expectStatus(
      "STUDENT",
      `/sessions/${SEED.sessionAttendanceId}`,
      403,
      {
        method: "PATCH",
        body: JSON.stringify({
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      },
    );
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

test.describe("sessions completion HTTP @http", () => {
  function futureStart(hour: number, attempt = 0) {
    const start = new Date();
    // Spread the day and hour on each retry so a pre-existing class at the same
    // slot (e.g. leftover from a prior timed-out run) cannot block forever.
    start.setUTCDate(start.getUTCDate() + 55 + ((attempt * 5) % 15));
    start.setUTCHours(
      (hour + attempt * 5) % 24,
      Math.floor(Math.random() * 60),
      Math.floor(Math.random() * 60),
      0,
    );
    return start;
  }

  async function createScheduled(
    batchId: string,
    hour: number,
  ): Promise<{ id: string; status: string }> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const start = futureStart(hour, attempt);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return await expectOk("TRAINER", "/sessions", {
          method: "POST",
          body: JSON.stringify({
            batchId,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            type: "REGULAR",
          }),
        });
      } catch (error) {
        if (!isScheduleConflict(error)) {
          throw error;
        }
        lastError = error;
      }
    }
    throw lastError;
  }

  test("trainer completes a session and is auto-assigned as instructor @http", async () => {
    const created = await createScheduled(SEED.kidsBatchId, 3);

    const completed = await expectOk<{
      id: string;
      status: string;
      trainerId: string;
    }>("TRAINER", `/sessions/${created.id}/complete`, { method: "PATCH" });

    expect(completed.status).toBe("COMPLETED");
    expect(completed.trainerId).toBe(SEED.users.TRAINER.id);
  });

  test("owner completes with an explicit trainer @http", async () => {
    const created = await createScheduled(SEED.trialBatchId, 4);

    const completed = await expectOk<{ id: string; trainerId: string }>(
      "OWNER",
      `/sessions/${created.id}/complete`,
      {
        method: "PATCH",
        body: JSON.stringify({ trainerId: SEED.users.TRAINER_2.id }),
      },
    );

    expect(completed.trainerId).toBe(SEED.users.TRAINER_2.id);
  });

  test("owner completing without a trainerId defaults to the first batch trainer @http", async () => {
    const created = await createScheduled(SEED.kidsBatchId, 5);

    const completed = await expectOk<{ id: string; trainerId: string }>(
      "OWNER",
      `/sessions/${created.id}/complete`,
      { method: "PATCH" },
    );

    expect(completed.trainerId).toBe(SEED.users.TRAINER.id);
  });

  test("owner completing an already completed session is rejected @http", async () => {
    await expectStatus(
      "OWNER",
      `/sessions/${SEED.sessionAttendancePastId}/complete`,
      400,
      { method: "PATCH" },
    );
  });

  test("a studio trainer not assigned to the batch still gets auto-assigned @http", async () => {
    const created = await createScheduled(SEED.kidsBatchId, 6);

    const completed = await expectOk<{ trainerId: string }>(
      "TRAINER",
      `/sessions/${created.id}/complete`,
      { method: "PATCH" },
      { userId: SEED.users.TRAINER_2.id },
    );

    expect(completed.trainerId).toBe(SEED.users.TRAINER_2.id);
  });
});

test.describe("sessions incomplete-past HTTP @http", () => {
  test("owner sees overdue scheduled sessions with first-trainer hint @http", async () => {
    const rows = await expectOk<
      Array<{
        id: string;
        batchName: string;
        firstTrainer: { id: string; name: string } | null;
      }>
    >("OWNER", `/sessions/studio/${SEED.studioId}/incomplete-past`);

    const ids = rows.map((row) => row.id);
    expect(ids).toContain(SEED.sessionIncompletePastId);
    const row = rows.find((entry) => entry.id === SEED.sessionIncompletePastId);
    expect(row?.firstTrainer?.id).toBe(SEED.users.TRAINER.id);
  });

  test("trainer cannot list incomplete-past @http", async () => {
    await expectStatus(
      "TRAINER",
      `/sessions/studio/${SEED.studioId}/incomplete-past`,
      403,
    );
  });
});
