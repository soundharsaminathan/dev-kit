import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("student home smoke @critical", () => {
  test("student home shell renders interactive content @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/?$/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByTestId("notifications-bell"))
        .first(),
    ).toBeVisible();
    await context.close();
  });
});
