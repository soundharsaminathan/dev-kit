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
    await expect(page.locator('a[href="/app/payments"]')).toHaveCount(0);
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
    await expect(
      page.getByRole("button", { name: "Account menu" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(
      page.getByRole("menuitem", { name: "Sign out" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();

    await page.getByRole("button", { name: "Create studio" }).click();
    await expect(page).toHaveURL(/\/admin\/studios\/new\/?$/);
    await expect(
      page.getByRole("heading", { name: "Details", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Studio name").fill("E2E Admin Studio");
    await page.getByLabel("Owner email").fill("e2e-new-owner@stepup.dev");
    await page.getByTestId("studio-wizard-next").click();
    await expect(
      page.getByRole("heading", { name: "Optional Branding", exact: true }),
    ).toBeVisible();
    await page.getByTestId("studio-wizard-next").click();
    await expect(
      page.getByRole("heading", { name: "Payments", exact: true }),
    ).toBeVisible();

    await page.goto("/admin");
    await waitForAppReady(page);
    const editLink = page.getByTestId(/edit-studio-/).first();
    await expect(editLink).toBeVisible();
    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/studios\/[^/]+\/?$/);
    await expect(
      page.getByRole("heading", { name: "Edit studio", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("admin-studio-switcher")).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Features" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Invoices" })).toBeVisible();

    await context.close();
  });
});
