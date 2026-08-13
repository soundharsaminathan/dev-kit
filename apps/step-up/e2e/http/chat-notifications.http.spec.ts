import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { staffEnroll } from "./billing-fixtures";
import {
  createFutureScheduleBatch,
  createHttpStudent,
  expectOk,
  expectStatus,
  TestDataCleanup,
} from "./helpers";

type ChatEvent = {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
};

type ChatMessage = {
  id: string;
  type: string;
  text: string | null;
  event: ChatEvent | null;
};

type ChatMessagesPage = {
  messages: ChatMessage[];
  nextCursor: string | null;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  meta?: { sessionId?: string; batchId?: string; action?: string };
};

type NotificationList = {
  items: NotificationItem[];
};

function uniqueSessionWindow() {
  const dayOffset = 90 + Math.floor(Math.random() * 40);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + dayOffset);
  start.setUTCHours(
    4,
    Math.floor(Math.random() * 50),
    Math.floor(Math.random() * 50),
    0,
  );
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor<T>(
  label: string,
  find: () => Promise<T | null | undefined>,
  attempts = 10,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const value = await find();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(250 * (attempt + 1));
  }
  const detail =
    lastError instanceof Error ? `: ${lastError.message}` : "";
  throw new Error(`${label} did not appear${detail}`);
}

async function listBatchMessages(batchId: string) {
  const conversation = await expectOk<{ id: string }>(
    "STAFF",
    `/chat/batches/${batchId}/conversation`,
  );
  const page = await expectOk<ChatMessagesPage>(
    "STAFF",
    `/chat/conversations/${conversation.id}/messages`,
  );
  return { conversationId: conversation.id, messages: page.messages };
}

async function waitForChatMessage(
  batchId: string,
  match: (message: ChatMessage) => boolean,
  label: string,
) {
  return waitFor(label, async () => {
    const { messages } = await listBatchMessages(batchId);
    return messages.find(match) ?? null;
  });
}

async function waitForStudentNotification(
  studentId: string,
  type: string,
  sessionId: string,
) {
  return waitFor(`${type} for ${sessionId}`, async () => {
    const list = await expectOk<NotificationList>(
      "STUDENT",
      "/notifications?limit=50",
      undefined,
      { userId: studentId },
    );
    return (
      list.items.find(
        (item) => item.type === type && item.meta?.sessionId === sessionId,
      ) ?? null
    );
  });
}

test.describe("batch chat notifications HTTP @http", () => {
  test("session add, reschedule, and cancel post chat cards and notify the student @http", async () => {
    test.setTimeout(90_000);
    const cleanup = new TestDataCleanup();
    let sessionId: string | null = null;
    try {
      const batch = await createFutureScheduleBatch(cleanup, {
        name: `Chat Session Notices ${Date.now()}`,
      });
      const student = await createHttpStudent("Chat Session Viewer", cleanup);
      await staffEnroll(batch.id, student.id, SEED.adultPlanIds[0]);

      const { start, end } = uniqueSessionWindow();
      const created = await expectOk<{
        id: string;
        startsAt: string;
        endsAt: string;
      }>("TRAINER", "/sessions", {
        method: "POST",
        body: JSON.stringify({
          batchId: batch.id,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          type: "REGULAR",
        }),
      });
      sessionId = created.id;

      const addedCard = await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "EVENT" &&
          message.event?.title === "New class session" &&
          message.event.startsAt === created.startsAt,
        "new session chat card",
      );
      expect(addedCard.event?.description).toMatch(/new session was added/i);

      const addedNote = await waitForStudentNotification(
        student.id,
        "SESSION_ADDED",
        created.id,
      );
      expect(addedNote.title).toMatch(/new class session/i);
      expect(addedNote.meta?.batchId).toBe(batch.id);
      expect(addedNote.meta?.action).toBe("added");

      const movedStart = new Date(start.getTime() + 20 * 60 * 1000);
      const movedEnd = new Date(movedStart.getTime() + 60 * 60 * 1000);
      const updated = await expectOk<{ startsAt: string }>(
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

      const changedCard = await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "EVENT" &&
          message.event?.title === "Session rescheduled" &&
          message.event.startsAt === updated.startsAt,
        "rescheduled session chat card",
      );
      expect(changedCard.event?.description).toMatch(/moved/i);

      const changedNote = await waitForStudentNotification(
        student.id,
        "SESSION_CHANGED",
        created.id,
      );
      expect(changedNote.title).toMatch(/rescheduled/i);
      expect(changedNote.meta?.action).toBe("changed");

      await expectOk<{ status: string }>("TRAINER", `/sessions/${created.id}`, {
        method: "DELETE",
      });
      sessionId = null;

      const cancelledCard = await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "EVENT" &&
          message.event?.title === "Session cancelled" &&
          message.event.startsAt === updated.startsAt,
        "cancelled session chat card",
      );
      expect(cancelledCard.event?.description).toMatch(/cancelled this session/i);

      const cancelledNote = await waitForStudentNotification(
        student.id,
        "SESSION_CANCELLED",
        created.id,
      );
      expect(cancelledNote.title).toMatch(/cancelled/i);
      expect(cancelledNote.meta?.action).toBe("cancelled");
    } finally {
      if (sessionId) {
        await expectOk("TRAINER", `/sessions/${sessionId}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      await cleanup.dispose();
    }
  });

  test("enrolling a student posts a joined notice in the batch chat @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const stamp = Date.now();
      const name = `Chat Joiner ${stamp}`;
      const batch = await createFutureScheduleBatch(cleanup, {
        name: `Chat Join Notices ${stamp}`,
      });
      const student = await createHttpStudent(name, cleanup);
      await staffEnroll(batch.id, student.id, SEED.adultPlanIds[0]);

      const notice = await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "SYSTEM" &&
          (message.text ?? "").includes(`${name} joined the group`),
        "member joined chat notice",
      );
      expect(notice.text).toBe(`${name} joined the group`);

      const asStudent = await expectOk<{ id: string }>(
        "STUDENT",
        `/chat/batches/${batch.id}/conversation`,
        undefined,
        { userId: student.id },
      );
      expect(asStudent.id).toBeTruthy();
    } finally {
      await cleanup.dispose();
    }
  });

  test("bulk enroll posts one combined joined notice @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const stamp = Date.now();
      const firstName = `Chat Bulk A ${stamp}`;
      const secondName = `Chat Bulk B ${stamp}`;
      const first = await createHttpStudent(firstName, cleanup);
      const second = await createHttpStudent(secondName, cleanup);
      const batch = await createFutureScheduleBatch(cleanup, {
        name: `Chat Bulk Join ${stamp}`,
      });

      await expectOk("STAFF", `/batches/${batch.id}/enroll-bulk`, {
        method: "POST",
        body: JSON.stringify({
          studentIds: [first.id, second.id],
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });

      const notice = await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "SYSTEM" &&
          (message.text ?? "").includes("joined the group") &&
          (message.text ?? "").includes(firstName) &&
          (message.text ?? "").includes(secondName),
        "bulk member joined chat notice",
      );
      expect(notice.text).toBe(
        `${firstName} and ${secondName} joined the group`,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("already-enrolled student does not get another joined notice @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const stamp = Date.now();
      const name = `Chat Repeat ${stamp}`;
      const batch = await createFutureScheduleBatch(cleanup, {
        name: `Chat Repeat Join ${stamp}`,
      });
      const student = await createHttpStudent(name, cleanup);
      await staffEnroll(batch.id, student.id, SEED.adultPlanIds[0]);

      await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "SYSTEM" &&
          (message.text ?? "") === `${name} joined the group`,
        "first joined notice",
      );

      await expectStatus("STAFF", `/batches/${batch.id}/enroll`, 400, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });

      await sleep(400);
      const { messages } = await listBatchMessages(batch.id);
      const joined = messages.filter(
        (message) =>
          message.type === "SYSTEM" &&
          (message.text ?? "") === `${name} joined the group`,
      );
      expect(joined).toHaveLength(1);
    } finally {
      await cleanup.dispose();
    }
  });

  test("outsider cannot read the batch conversation @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const batch = await createFutureScheduleBatch(cleanup, {
        name: `Chat Forbid ${Date.now()}`,
      });
      const member = await createHttpStudent("Chat Member", cleanup);
      const outsider = await createHttpStudent("Chat Outsider", cleanup);
      await staffEnroll(batch.id, member.id, SEED.adultPlanIds[0]);

      const conversation = await expectOk<{ id: string }>(
        "STAFF",
        `/chat/batches/${batch.id}/conversation`,
      );

      await expectStatus(
        "STUDENT",
        `/chat/batches/${batch.id}/conversation`,
        403,
        undefined,
        { userId: outsider.id },
      );
      await expectStatus(
        "STUDENT",
        `/chat/conversations/${conversation.id}/messages`,
        403,
        undefined,
        { userId: outsider.id },
      );
    } finally {
      await cleanup.dispose();
    }
  });
});
