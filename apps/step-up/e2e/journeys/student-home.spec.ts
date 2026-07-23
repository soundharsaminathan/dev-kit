import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("student home smoke", () => {
  test("student home shell renders", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/?$/);
    await expect(page.locator("body")).not.toBeEmpty();
    await context.close();
  });
});
