import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("admin payments @critical", () => {
  test("staff payments and invoices pages load @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();

    await page.goto("/app/payments", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/payments/);
    await expect(
      page.getByRole("heading", { name: /^payments$/i }),
    ).toBeVisible();

    await page.goto("/app/invoices", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/invoices/);
    await expect(
      page.getByRole("heading", { name: /^invoices$/i }),
    ).toBeVisible();

    await context.close();
  });
});
