import AxeBuilder from "@axe-core/playwright";
import { authFile, expect, test, waitForAppReady } from "../fixtures";

test.describe("a11y smoke", () => {
  test("login page has no critical axe violations", async ({ page }) => {
    await page.goto("/login");
    await waitForAppReady(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });

  test("student shell has no critical axe violations", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me/);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
    await context.close();
  });
});
