import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import {
  createOnboardedStudent,
  impersonateStudent,
} from "../fixtures/onboarded-student";
import { SEED } from "../fixtures/seed";
import { staffEnroll } from "../http/billing-fixtures";
import {
  createFutureScheduleBatch,
  expectOk,
  TestDataCleanup,
} from "../http/helpers";

type ChatMessage = {
  type: string;
  text: string | null;
  event: { title: string; startsAt: string } | null;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForChatMessage(
  batchId: string,
  match: (message: ChatMessage) => boolean,
  label: string,
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const conversation = await apiRequest<{ id: string }>(
      "STAFF",
      `/chat/batches/${batchId}/conversation`,
    );
    const page = await apiRequest<{ messages: ChatMessage[] }>(
      "STAFF",
      `/chat/conversations/${conversation.id}/messages`,
    );
    const found = page.messages.find(match);
    if (found) return { conversationId: conversation.id, message: found };
    await sleep(250 * (attempt + 1));
  }
  throw new Error(`${label} did not appear in batch chat`);
}

function uniqueSessionWindow() {
  const dayOffset = 110 + Math.floor(Math.random() * 30);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + dayOffset);
  start.setUTCHours(5, 17, Math.floor(Math.random() * 50), 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

test.describe("class chat notifications", () => {
  test("student sees session and member notices in class chat", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const cleanup = new TestDataCleanup();
    let sessionId: string | null = null;
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();

    try {
      const batch = await createFutureScheduleBatch(cleanup, {
        name: `Chat UI Notices ${Date.now()}`,
      });
      const student = await createOnboardedStudent("Chat UI Member", cleanup);
      await staffEnroll(batch.id, student.id, SEED.adultPlanIds[0]);

      await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "SYSTEM" &&
          (message.text ?? "").includes(`${student.name} joined the group`),
        "joined notice",
      );

      const { start, end } = uniqueSessionWindow();
      const created = await expectOk<{ id: string; startsAt: string }>(
        "TRAINER",
        "/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            batchId: batch.id,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            type: "REGULAR",
          }),
        },
      );
      sessionId = created.id;

      await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "EVENT" &&
          message.event?.title === "New class session" &&
          message.event.startsAt === created.startsAt,
        "new session card",
      );

      await impersonateStudent(page, student);
      await page.goto(`/me/batches/${batch.id}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);

      const [conversationResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes(`/chat/batches/${batch.id}/conversation`) &&
            response.request().method() === "GET" &&
            response.ok(),
        ),
        page.getByTestId("batch-chat-button").click(),
      ]);
      expect(conversationResponse.ok()).toBeTruthy();
      await expect(page).toHaveURL(/\/me\/messages\//);
      await waitForAppReady(page);

      await expect(page.getByTestId("chat-system-notice")).toContainText(
        `${student.name} joined the group`,
      );
      await expect(page.getByText("New class session")).toBeVisible();

      const movedStart = new Date(start.getTime() + 25 * 60 * 1000);
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

      await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "EVENT" &&
          message.event?.title === "Session rescheduled" &&
          message.event.startsAt === updated.startsAt,
        "rescheduled card",
      );

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page.getByText("Session rescheduled")).toBeVisible();

      await expectOk("TRAINER", `/sessions/${created.id}`, {
        method: "DELETE",
      });
      sessionId = null;

      await waitForChatMessage(
        batch.id,
        (message) =>
          message.type === "EVENT" &&
          message.event?.title === "Session cancelled",
        "cancelled card",
      );

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page.getByText("Session cancelled")).toBeVisible();
    } finally {
      if (sessionId) {
        await apiRequest("TRAINER", `/sessions/${sessionId}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      await context.close();
      await cleanup.dispose();
    }
  });
});
