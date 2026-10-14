import { authFile, expect, test, waitForAppReady } from "../fixtures";
import { SEED } from "../fixtures/seed";
import { APP_MAIN, expectNoColorContrastViolations } from "./helpers";

const main = { include: APP_MAIN };

test.describe("a11y color contrast", () => {
  test("login page has no color contrast violations", async ({ page }) => {
    await page.goto("/login");
    await waitForAppReady(page);
    await expectNoColorContrastViolations(page, main);
  });

  test("student shell has no color contrast violations", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me/);
    await expectNoColorContrastViolations(page, main);
    await context.close();
  });

  test("discover book page has no color contrast violations", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/book");
    await waitForAppReady(page);
    await expectNoColorContrastViolations(page, main);
    await context.close();
  });

  test("trainer attendance roster has no color contrast violations", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    await page.goto(`/app/sessions/${SEED.sessionAttendanceId}/attendance`);
    await waitForAppReady(page);
    await expectNoColorContrastViolations(page, main);
    await context.close();
  });

  test("staff invoices page has no color contrast violations", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/invoices");
    await waitForAppReady(page);
    await expectNoColorContrastViolations(page, main);
    await context.close();
  });
});
