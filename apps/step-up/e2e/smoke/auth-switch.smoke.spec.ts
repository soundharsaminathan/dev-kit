import type { Page } from "@playwright/test";
import { expect, signInSmokeRole, test, waitForAppReady } from "./fixtures";

async function signOutFromStaffShell(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });
  await waitForAppReady(page);
}

test.describe("auth account switch @smoke", () => {
  test("owner signs out then student can sign in on the same browser @smoke", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await signInSmokeRole(page, "OWNER");
      await expect(page).toHaveURL(/\/app\/?$/);
      await expect(page.getByText(/here's your studio/i)).toBeVisible();
      await expect(page.getByTestId("owner-metric-tiles")).toBeVisible();

      await signOutFromStaffShell(page);
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: /welcome back/i }),
      ).toBeVisible();

      await signInSmokeRole(page, "STUDENT", { clearSession: true });
      await expect(page).toHaveURL(/\/me\/?$/);
      await expect(page.getByText(/here's your studio/i)).toHaveCount(0);
      await expect(page.getByTestId("owner-metric-tiles")).toHaveCount(0);
      await expect(page.getByText(/let's dance/i)).toBeVisible();

      await page.goto("/app", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/me/);
    } finally {
      await context.close();
    }
  });
});
