import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("notification journey @critical", () => {
  test("student opens notifications and marks read through UI @critical", async ({
    browser,
  }) => {
    const sessionId = SEED.sessionAttendanceId;
    const studentId = SEED.users.STUDENT.id;

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
      items: Array<{ id: string; type: string; readAt: string | null }>;
    }>("STUDENT", "/notifications?limit=20");

    const missed = notifications.items.find(
      (item) => item.type === "MISSED_SESSION",
    );
    expect(missed).toBeTruthy();

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
});
