import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

async function seedMissedSession() {
  const sessionId = SEED.sessionAttendanceId;
  const studentId = SEED.users.STUDENT.id;

  await apiRequest("TRAINER", "/attendance/mark", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      studentId,
      status: "PRESENT",
      source: "TRAINER",
    }),
  }).catch(() => undefined);

  await apiRequest("TRAINER", "/attendance/mark", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      studentId,
      status: "ABSENT",
      source: "TRAINER",
    }),
  });

  const notifications = await apiRequest<{
    items: Array<{
      id: string;
      type: string;
      readAt: string | null;
      meta?: { batchId?: string };
    }>;
  }>("STUDENT", "/notifications?limit=20");

  const missed = notifications.items.find(
    (item) => item.type === "MISSED_SESSION",
  );
  expect(missed).toBeTruthy();
  return missed!;
}

test.describe("notification journey @critical", () => {
  test("student opens notifications and marks read through UI @critical", async ({
    browser,
  }) => {
    await seedMissedSession();

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);

    const bell = page.getByTestId("notifications-bell");
    await expect(bell).toBeVisible();
    await bell.click();

    await expect(
      page
        .getByText(/Notifications|No notifications|caught up|Missed/i)
        .first(),
    ).toBeVisible();

    const unreadItem = page.locator('[data-unread="true"]').first();
    const markAll = page.getByTestId("notifications-mark-all-read");

    if ((await unreadItem.count()) > 0) {
      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: "/notifications/",
        }),
        unreadItem.click(),
      ]);
      expect(response.ok()).toBeTruthy();
    } else if ((await markAll.count()) > 0) {
      const [response] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/notifications/mark-all-read",
        }),
        markAll.click(),
      ]);
      expect(response.ok()).toBeTruthy();
    }

    await context.close();
  });

  test("student opens MISSED_SESSION and deep-links to the batch @critical", async ({
    browser,
  }) => {
    const missed = await seedMissedSession();
    const batchId = missed.meta?.batchId ?? SEED.kidsBatchId;

    if (missed.readAt) {
      await apiRequest("STUDENT", `/notifications/${missed.id}`, {
        method: "PATCH",
        body: JSON.stringify({ read: false }),
      });
    }

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);

    await page.getByTestId("notifications-bell").click();

    const missedItem = page.locator('[data-type="MISSED_SESSION"]').first();
    await expect(missedItem).toBeVisible();

    await Promise.all([
      waitForApiResponse(page, {
        method: "PATCH",
        pathIncludes: `/notifications/${missed.id}`,
      }).catch(() => undefined),
      missedItem.click(),
    ]);

    await expect(page).toHaveURL(new RegExp(`/me/batches/${batchId}`));
    await waitForAppReady(page);

    await context.close();
  });

  test("student marks all notifications read from the panel @critical", async ({
    browser,
  }) => {
    await seedMissedSession();

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);

    await page.getByTestId("notifications-bell").click();

    const markAll = page.getByTestId("notifications-mark-all-read");
    await expect(markAll).toBeVisible();

    const [response] = await Promise.all([
      waitForApiResponse(page, {
        method: "POST",
        pathIncludes: "/notifications/mark-all-read",
      }),
      markAll.click(),
    ]);
    expect(response.ok()).toBeTruthy();

    await expect(page.getByText(/all caught up/i)).toBeVisible();

    const unread = await apiRequest<{ count: number }>(
      "STUDENT",
      "/notifications/unread-count",
    );
    expect(unread.count).toBe(0);

    await context.close();
  });
});
