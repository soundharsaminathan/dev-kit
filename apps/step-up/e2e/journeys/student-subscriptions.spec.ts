import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("student subscriptions @critical", () => {
  test("student can open subscriptions lifecycle page @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/subscriptions");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/subscriptions/);
    await expect(page.locator("body")).not.toBeEmpty();
    await context.close();
  });
});
