import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("notification journey @critical", () => {
  test("student receives MISSED_SESSION and can open notifications shell @critical", async ({
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

    if (missed && !missed.readAt) {
      await apiRequest("STUDENT", `/notifications/${missed.id}/read`, {
        method: "PATCH",
      }).catch(async () => {
        await apiRequest("STUDENT", `/notifications/${missed.id}`, {
          method: "PATCH",
          body: JSON.stringify({ read: true }),
        });
      });
    }

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);

    const bell = page.getByRole("button", { name: /notifications/i });
    if (await bell.count()) {
      await bell.first().click();
      await expect(
        page.getByText(/Notifications|No notifications|caught up/i).first(),
      ).toBeVisible();
    }

    await context.close();
  });
});
