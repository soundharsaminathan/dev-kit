import type { Page } from "@playwright/test";
import { expect, SMOKE, test, waitForAppReady } from "./fixtures";
import { homePathForRole, type SmokeRole, smokePassword } from "./smoke-seed";

async function signInAs(page: Page, role: SmokeRole, password: string) {
  const user = SMOKE.users[role];
  const home = homePathForRole(role);

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await page.getByLabel(/email or username/i).fill(user.email);
  await page.locator('input[type="password"]').fill(password);
  await Promise.all([
    page.waitForURL(new RegExp(home.replace("/", "\\/")), { timeout: 60_000 }),
    page
      .getByRole("main")
      .getByRole("button", { name: /^sign in$/i })
      .click(),
  ]);
  await waitForAppReady(page);
}

async function signOutFromStaffShell(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await Promise.all([
    page.waitForURL(/\/login/, { timeout: 60_000 }),
    page.getByRole("menuitem", { name: "Sign out" }).click(),
  ]);
  await waitForAppReady(page);
}

test.describe("auth account switch @smoke", () => {
  test("owner signs out then student can sign in on the same browser @smoke", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const password = smokePassword();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await signInAs(page, "OWNER", password);
      await expect(page).toHaveURL(/\/app\/?$/);
      await expect(page.getByText(/here's your studio/i)).toBeVisible();
      await expect(page.getByTestId("owner-metric-tiles")).toBeVisible();

      await signOutFromStaffShell(page);
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: /welcome back/i }),
      ).toBeVisible();

      await signInAs(page, "STUDENT", password);
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
