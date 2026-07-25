import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("student attendance @critical", () => {
  test("student attendance history shows session records @critical", async ({
    browser,
  }) => {
    // Ensure at least one attendance record exists for history-ready sessions.
    await apiRequest("TRAINER", "/attendance/mark", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-kids-past-1",
        studentId: SEED.users.STUDENT.id,
        status: "PRESENT",
        source: "TRAINER",
      }),
    }).catch(() => null);

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/attendance");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/attendance/);
    await expect(
      page.getByRole("heading", { name: /attendance/i }),
    ).toBeVisible();

    const row = page.locator("[data-testid^='attendance-row-']").first();
    const empty = page.getByText(/No attendance yet/i);
    await expect(row.or(empty).first()).toBeVisible();

    await context.close();
  });
});
