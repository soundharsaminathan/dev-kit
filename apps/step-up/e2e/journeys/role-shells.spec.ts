import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("role shells @critical", () => {
  test("trainer lands on staff shell @critical", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    await page.goto("/app");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/app/);
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
});
