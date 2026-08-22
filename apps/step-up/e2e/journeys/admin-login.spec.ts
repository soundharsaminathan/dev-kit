import type { Page } from "@playwright/test";
import { expect, test, waitForAppReady } from "../fixtures";

const BYPASS_PASSWORD = "password";
const ADMIN_EMAIL = "admin@stepup.dev";

async function expectAdminStudiosShell(page: Page) {
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 60_000 });
  await waitForAppReady(page);
  await expect(
    page.getByRole("heading", { name: "Studios", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create studio" }),
  ).toBeVisible();
}

async function signInFromLogin(page: Page, identifier: string) {
  await page.goto("/login");
  await waitForAppReady(page);
  await page.getByLabel("Email or username").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(BYPASS_PASSWORD);
  await page.getByRole("main").getByRole("button", { name: "Sign in" }).click();
  await expectAdminStudiosShell(page);
}

test.describe("system admin login @critical", () => {
  test("signs in with email and password @critical", async ({ page }) => {
    await signInFromLogin(page, ADMIN_EMAIL);
  });

  test("signs in with admin alias @critical", async ({ page }) => {
    await signInFromLogin(page, "admin");
  });

  test("signs in via Continue as system admin @critical", async ({ page }) => {
    await page.goto("/login");
    await waitForAppReady(page);
    await page
      .getByRole("button", { name: "Continue as system admin" })
      .click();
    await expectAdminStudiosShell(page);
  });
});
