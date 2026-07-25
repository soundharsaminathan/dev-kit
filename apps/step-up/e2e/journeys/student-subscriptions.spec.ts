import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("student subscriptions @critical", () => {
  test("student subscriptions page shows membership lifecycle @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/subscriptions");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/subscriptions/);
    await expect(
      page
        .getByRole("heading")
        .or(page.getByText(/subscription|membership|plan/i))
        .first(),
    ).toBeVisible();

    // Seeded student has memberships — assert at least one status or plan card.
    await expect(
      page.getByText(/ACTIVE|DUE|EXPIRED|Individual|Family|₹/i).first(),
    ).toBeVisible();

    await context.close();
  });
});
