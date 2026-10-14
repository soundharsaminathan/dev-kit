import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  deletedAt?: string | null;
  status?: string;
  meta?: { batchId?: string; sessionId?: string };
};

type NotificationList = {
  items: NotificationItem[];
  nextCursor?: string | null;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function findMissedSessionNotification() {
  const list = await expectOk<NotificationList>(
    "STUDENT",
    "/notifications?limit=50",
  );
  return (
    list.items.find(
      (item) =>
        item.type === "MISSED_SESSION" &&
        item.meta?.sessionId === SEED.sessionAttendanceId,
    ) ?? null
  );
}

async function ensureMissedSessionNotification() {
  await expectOk("TRAINER", "/attendance/mark", {
    method: "POST",
    body: JSON.stringify({
      sessionId: SEED.sessionAttendanceId,
      studentId: SEED.users.STUDENT.id,
      status: "PRESENT",
      source: "TRAINER",
    }),
  }).catch(() => undefined);

  let missed: NotificationItem | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await expectOk("TRAINER", "/attendance/mark", {
        method: "POST",
        body: JSON.stringify({
          sessionId: SEED.sessionAttendanceId,
          studentId: SEED.users.STUDENT.id,
          status: "ABSENT",
          source: "TRAINER",
        }),
      });
      missed = await findMissedSessionNotification();
      if (missed) break;
    } catch (error) {
      lastError = error;
    }
    await sleep(300 * (attempt + 1));
  }

  expect(
    missed,
    lastError instanceof Error
      ? `MISSED_SESSION missing after ABSENT mark: ${lastError.message}`
      : "MISSED_SESSION missing after ABSENT mark",
  ).toBeTruthy();

  // Force active + unread — rematch ABSENT refreshes the deduped row, but
  // archive/delete/mark-all-read from earlier serial cases can still leave
  // stale client expectations if list pagination hides it.
  await expectOk("STUDENT", `/notifications/${missed!.id}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: false, read: false }),
  });

  missed = await findMissedSessionNotification();
  expect(missed).toBeTruthy();
  expect(missed!.readAt).toBeNull();
  expect(missed!.status?.toUpperCase() ?? "ACTIVE").toBe("ACTIVE");
  return missed!;
}

test.describe("notifications HTTP @http", () => {
  // Shared seed student + MISSED_SESSION dedupe — mark-all / archive / unread
  // assertions must not race under fullyParallel.
  test.describe.configure({ mode: "serial" });
  test("student receives MISSED_SESSION after trainer marks absent @http", async () => {
    const missed = await ensureMissedSessionNotification();

    expect(missed.title).toMatch(/missed session/i);
    expect(missed.meta?.sessionId).toBe(SEED.sessionAttendanceId);
    expect(missed.meta?.batchId).toBe(SEED.kidsBatchId);
  });

  test("student lists unread, reads one, and sees unread count drop @http", async () => {
    const missed = await ensureMissedSessionNotification();

    const unreadBefore = await expectOk<{ count: number }>(
      "STUDENT",
      "/notifications/unread-count",
    );
    expect(unreadBefore.count).toBeGreaterThan(0);

    const unreadOnly = await expectOk<NotificationList>(
      "STUDENT",
      "/notifications?unreadOnly=true&limit=50",
    );
    expect(unreadOnly.items.every((item) => item.readAt === null)).toBeTruthy();
    expect(unreadOnly.items.some((item) => item.id === missed.id)).toBeTruthy();

    const marked = await expectOk<NotificationItem>(
      "STUDENT",
      `/notifications/${missed.id}/read`,
      { method: "PATCH" },
    );
    expect(marked.readAt).toBeTruthy();

    const unreadAfter = await expectOk<{ count: number }>(
      "STUDENT",
      "/notifications/unread-count",
    );
    expect(unreadAfter.count).toBeLessThan(unreadBefore.count);
  });

  test("student mark-all-read clears active unread @http", async () => {
    await ensureMissedSessionNotification();

    const result = await expectOk<{ count: number }>(
      "STUDENT",
      "/notifications/mark-all-read",
      { method: "POST" },
    );
    expect(result.count).toBeGreaterThanOrEqual(0);

    const unread = await expectOk<{ count: number }>(
      "STUDENT",
      "/notifications/unread-count",
    );
    expect(unread.count).toBe(0);

    const unreadOnly = await expectOk<NotificationList>(
      "STUDENT",
      "/notifications?unreadOnly=true&limit=20",
    );
    expect(unreadOnly.items).toHaveLength(0);
  });

  test("student can archive and soft-delete a notification @http", async () => {
    const missed = await ensureMissedSessionNotification();

    const archived = await expectOk<NotificationItem>(
      "STUDENT",
      `/notifications/${missed.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      },
    );
    expect(archived.status ?? "ARCHIVED").toMatch(/ARCHIVED/i);

    const deleted = await expectOk<NotificationItem>(
      "STUDENT",
      `/notifications/${missed.id}`,
      { method: "DELETE" },
    );
    expect(deleted.deletedAt ?? deleted.status).toBeTruthy();

    await expectStatus("STUDENT", `/notifications/${missed.id}/read`, 404, {
      method: "PATCH",
    });
  });

  test("student gets and updates notification preferences @http", async () => {
    const prefs = await expectOk<
      Array<{
        type: string;
        channel: string;
        enabled: boolean;
        quietStartMinutes: number | null;
        quietEndMinutes: number | null;
      }>
    >("STUDENT", "/notifications/preferences");

    expect(prefs.length).toBeGreaterThan(0);
    expect(
      prefs.some(
        (row) => row.type === "MISSED_SESSION" && row.channel === "PUSH",
      ),
    ).toBeTruthy();

    const updated = await expectOk<typeof prefs>(
      "STUDENT",
      "/notifications/preferences",
      {
        method: "PUT",
        body: JSON.stringify({
          preferences: [
            {
              type: "MISSED_SESSION",
              channel: "PUSH",
              enabled: false,
              quietStartMinutes: 1320,
              quietEndMinutes: 480,
            },
          ],
        }),
      },
    );

    const missedPush = updated.find(
      (row) => row.type === "MISSED_SESSION" && row.channel === "PUSH",
    );
    expect(missedPush).toEqual(
      expect.objectContaining({
        enabled: false,
        quietStartMinutes: 1320,
        quietEndMinutes: 480,
      }),
    );

    await expectOk("STUDENT", "/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify({
        preferences: [
          {
            type: "MISSED_SESSION",
            channel: "PUSH",
            enabled: true,
            quietStartMinutes: null,
            quietEndMinutes: null,
          },
        ],
      }),
    });
  });

  test("student registers and unregisters a push device @http", async () => {
    const token = `e2e-fcm-${Date.now()}`;

    const registered = await expectOk<{ ok: boolean }>(
      "STUDENT",
      "/notifications/devices",
      {
        method: "POST",
        body: JSON.stringify({
          token,
          platform: "web",
          appVersion: "e2e",
        }),
      },
    );
    expect(registered.ok).toBe(true);

    const unregistered = await expectOk<{ ok: boolean }>(
      "STUDENT",
      `/notifications/devices/${encodeURIComponent(token)}`,
      { method: "DELETE" },
    );
    expect(unregistered.ok).toBe(true);
  });

  test("student cannot mark another user's notification @http", async () => {
    const missed = await ensureMissedSessionNotification();

    await expectStatus("TRAINER", `/notifications/${missed.id}/read`, 404, {
      method: "PATCH",
    });
  });
});
