import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("role shells @critical", () => {
  test("trainer lands on staff shell without admin nav @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    await page.goto("/app");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app/);
    await expect(page.locator('a[href="/app/batches"]')).not.toHaveCount(0);
    await expect(page.locator('a[href="/app/settings"]')).toHaveCount(0);
    await expect(page.locator('a[href="/app/students"]')).toHaveCount(0);
    await expect(page.locator('a[href="/app/invoices"]')).toHaveCount(0);
    await expect(page.locator('a[href="/app/certificates"]')).toHaveCount(0);
    await context.close();
  });

  test("trainer is redirected away from settings", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    await page.goto("/app/settings");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app\/?$/);
    await context.close();
  });

  test("student lands on member shell", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/?$/);
    await context.close();
  });

  test("student cannot stay on staff shell", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/app");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me/);
    await context.close();
  });

  test("trainer cannot stay on member shell", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app/);
    await context.close();
  });

  test("guest is sent to login", async ({ page }) => {
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test("system admin lands on admin studios @critical", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("SYSTEM_ADMIN"),
    });
    const page = await context.newPage();
    await page.goto("/admin");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(
      page.getByRole("heading", { name: "Studios", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create studio" }),
    ).toBeVisible();
    await context.close();
  });
});
