import type { Page } from "@playwright/test";
import { expect, SMOKE, test, waitForAppReady } from "./fixtures";
import { homePathForRole, type SmokeRole, smokePassword } from "./smoke-seed";

/** Wipe Firebase/local session leftovers so the next UI sign-in is clean. */
async function clearBrowserAuthState(page: Page) {
  await page.evaluate(async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      const databases = await indexedDB.databases?.();
      if (databases) {
        await Promise.all(
          databases
            .filter((db) => db.name)
            .map(
              (db) =>
                new Promise<void>((resolve) => {
                  const req = indexedDB.deleteDatabase(db.name!);
                  req.onsuccess = () => resolve();
                  req.onerror = () => resolve();
                  req.onblocked = () => resolve();
                }),
            ),
        );
      }
    } catch {
      // Best-effort wipe.
    }
  });
}

async function signInAs(page: Page, role: SmokeRole, password: string) {
  const user = SMOKE.users[role];
  const home = homePathForRole(role);

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await clearBrowserAuthState(page);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);

  await page.getByLabel(/email or username/i).fill(user.email);
  await page.locator('input[type="password"]').fill(password);
  // Match auth.setup: click then poll URL. Avoid waitForURL({ waitUntil: "load" })
  // — SPA client navigations often never fire a document load event.
  await page
    .getByRole("main")
    .getByRole("button", { name: /^sign in$/i })
    .click();
  await expect(page).toHaveURL(new RegExp(home.replace("/", "\\/")), {
    timeout: 60_000,
  });
  await waitForAppReady(page);
}

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
