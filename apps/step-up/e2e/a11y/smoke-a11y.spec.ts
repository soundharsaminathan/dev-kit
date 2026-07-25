import AxeBuilder from "@axe-core/playwright";
import { authFile, expect, test, waitForAppReady } from "../fixtures";
import { SEED } from "../fixtures/seed";

async function expectNoCriticalAxe(
  page: Parameters<typeof waitForAppReady>[0],
) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .disableRules(["color-contrast"])
    .analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(critical).toEqual([]);
}

test.describe("a11y smoke", () => {
  test("login page has no critical axe violations", async ({ page }) => {
    await page.goto("/login");
    await waitForAppReady(page);
    await expectNoCriticalAxe(page);
  });

  test("student shell has no critical axe violations", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me/);
    await expectNoCriticalAxe(page);
    await context.close();
  });

  test("discover book page has no critical axe violations", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/book");
    await waitForAppReady(page);
    await expectNoCriticalAxe(page);
    await context.close();
  });

  test("trainer attendance roster has no critical axe violations", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("TRAINER"),
    });
    const page = await context.newPage();
    await page.goto(`/app/sessions/${SEED.sessionAttendanceId}/attendance`);
    await waitForAppReady(page);
    await expectNoCriticalAxe(page);
    await context.close();
  });

  test("staff invoices page has no critical axe violations", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STAFF"),
    });
    const page = await context.newPage();
    await page.goto("/app/invoices");
    await waitForAppReady(page);
    await expectNoCriticalAxe(page);
    await context.close();
  });
});
