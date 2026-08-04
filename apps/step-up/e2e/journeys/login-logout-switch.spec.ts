import type { Page } from "@playwright/test";
import { expect, homePathForRole, test, waitForAppReady } from "../fixtures";
import { SEED, type SeedRole } from "../fixtures/seed";

const BYPASS_PASSWORD = "password";

async function signInAs(page: Page, role: SeedRole) {
  const user = SEED.users[role];
  await page.goto("/login");
  await waitForAppReady(page);
  await page.getByLabel("Email or username").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(BYPASS_PASSWORD);
  await Promise.all([
    page.waitForURL(new RegExp(homePathForRole(role).replace("/", "\\/"))),
    page.getByRole("main").getByRole("button", { name: "Sign in" }).click(),
  ]);
  await waitForAppReady(page);
}

async function signOutFromStaffShell(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await Promise.all([
    page.waitForURL(/\/login/),
    page.getByRole("menuitem", { name: "Sign out" }).click(),
  ]);
  await waitForAppReady(page);
}

test.describe("login logout account switch @critical", () => {
  test("owner signs out then student can sign in on the same browser @critical", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await signInAs(page, "OWNER");
      await expect(page).toHaveURL(/\/app\/?$/);
      const ownerFirst = SEED.users.OWNER.name.split(" ")[0];
      await expect(
        page.getByText(new RegExp(`${ownerFirst}.*studio`, "i")),
      ).toBeVisible();

      await signOutFromStaffShell(page);
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: "Welcome back" }),
      ).toBeVisible();

      await signInAs(page, "STUDENT");
      await expect(page).toHaveURL(/\/me\/?$/);
      await expect(page.getByText(/here's your studio/i)).toHaveCount(0);
      const studentFirst = SEED.users.STUDENT.name.split(" ")[0];
      await expect(
        page.getByText(new RegExp(`${studentFirst}.*dance`, "i")),
      ).toBeVisible();

      await page.goto("/app");
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/me/);
    } finally {
      await context.close();
    }
  });
});
