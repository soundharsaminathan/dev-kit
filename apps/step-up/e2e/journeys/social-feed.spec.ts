import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("social feed", () => {
  test("student feed shell loads", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/feed", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/feed/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/feed|post|follow|empty/i))
        .first(),
    ).toBeVisible();
    await context.close();
  });
});
