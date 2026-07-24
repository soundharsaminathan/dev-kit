import { authFile, expect, test, waitForAppReady } from "../fixtures";
import { AUTH_STORAGE_KEY, SEED } from "../fixtures/seed";

test.describe("onboarding gate @critical", () => {
  test("incomplete student is redirected to onboarding @critical", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();

    const incomplete = {
      ...SEED.users.STUDENT,
      onboardingCompletedAt: null,
    };

    await page.route("**/users/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(incomplete),
      });
    });

    await page.goto("/login");
    await page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      { key: AUTH_STORAGE_KEY, value: incomplete },
    );
    await page.goto("/me");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/onboarding/);
    await context.close();
  });

  test("completed student cannot open onboarding", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/onboarding");
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/?$/);
    await context.close();
  });
});
