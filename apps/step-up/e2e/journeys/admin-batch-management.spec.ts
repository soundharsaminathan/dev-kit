import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("admin batch management @critical", () => {
  test("staff can open batches list and new batch form @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();

    await page.goto("/app/batches", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/batches\/?$/);
    await expect(
      page.getByRole("heading", { name: /^batches$/i }),
    ).toBeVisible();

    await page.goto("/app/batches/new", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/batches\/new/);
    await expect(
      page.getByRole("heading", { name: /new batch/i }),
    ).toBeVisible();

    await context.close();
  });
});
