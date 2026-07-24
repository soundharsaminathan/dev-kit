import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("student attendance @critical", () => {
  test("student can open attendance history @critical", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/attendance");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/attendance/);
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/attendance/i))
        .first(),
    ).toBeVisible();
    await context.close();
  });
});
