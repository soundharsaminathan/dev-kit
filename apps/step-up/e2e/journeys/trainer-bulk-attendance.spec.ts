import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

test.describe("trainer bulk attendance @critical", () => {
  test("trainer can mark all present and open roster @critical", async ({
    browser,
  }) => {
    const sessionId = SEED.sessionAttendanceId;

    const result = await apiRequest<{ marked: number; failed: number }>(
      "TRAINER",
      `/attendance/session/${sessionId}/mark-all-present`,
      { method: "POST" },
    );

    expect(result.failed).toBe(0);

    const roster = await apiRequest<
      Array<{ attendance?: { status: string } | null }>
    >("TRAINER", `/attendance/session/${sessionId}/roster`);

    expect(roster.length).toBeGreaterThan(0);
    expect(
      roster.every((entry) => entry.attendance?.status === "PRESENT"),
    ).toBe(true);

    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    await page.goto(`/app/sessions/${sessionId}/attendance`, {
      waitUntil: "domcontentloaded",
    });
    await waitForAppReady(page);
    await expect(page).toHaveURL(
      new RegExp(`/sessions/${sessionId}/attendance`),
    );
    await expect(
      page.getByRole("heading", { name: /session attendance/i }),
    ).toBeVisible();
    await context.close();
  });
});
