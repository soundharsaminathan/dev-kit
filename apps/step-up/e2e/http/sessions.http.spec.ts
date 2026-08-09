import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

test.describe("sessions schedule HTTP @http", () => {
  test("trainer can create, reschedule, and cancel a session @http", async () => {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 14);
    start.setUTCHours(15, 0, 0, 0);
    const end = new Date(start);
    end.setUTCHours(16, 0, 0, 0);

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

    const movedStart = new Date(start);
    movedStart.setUTCHours(17, 0, 0, 0);
    const movedEnd = new Date(movedStart);
    movedEnd.setUTCHours(18, 0, 0, 0);

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
