import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test as setup } from "@playwright/test";
import {
  authFile,
  waitForApiReady,
  waitForAppReady,
  waitForWebReady,
} from "./fixtures";
import {
  homePathForRole,
  SMOKE,
  type SmokeRole,
  smokePassword,
} from "./smoke-seed";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(dirname, ".auth");

const roles: SmokeRole[] = [
  "SYSTEM_ADMIN",
  "OWNER",
  "STAFF",
  "TRAINER",
  "STUDENT",
  "PARENT",
  "ONBOARDING",
];

setup("authenticate smoke roles", async ({ page, request }) => {
  setup.setTimeout(300_000);
  fs.mkdirSync(authDir, { recursive: true });

  await waitForApiReady(request);
  await waitForWebReady(request);

  const password = smokePassword();

  for (const role of roles) {
    const user = SMOKE.users[role];
    const home = homePathForRole(role);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    // Clear any leftover Firebase session from a previous role.
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
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    await page.getByLabel(/email or username/i).fill(user.email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(new RegExp(home.replace("/", "\\/")), {
      timeout: 60_000,
    });
    await waitForAppReady(page);

    if (role === "ONBOARDING") {
      // Incomplete student must land on (or be gated to) onboarding.
      await expect(page).toHaveURL(/\/me(\/onboarding)?/);
    }

    await page.context().storageState({
      path: authFile(role),
      indexedDB: true,
    });
  }
});
