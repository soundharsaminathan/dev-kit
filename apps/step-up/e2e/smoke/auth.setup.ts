import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test as setup } from "@playwright/test";
import {
  authFile,
  signInSmokeRole,
  waitForApiReady,
  waitForWebReady,
} from "./fixtures";
import type { SmokeRole } from "./smoke-seed";

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

setup("authenticate smoke roles", async ({ browser, request }) => {
  setup.setTimeout(300_000);
  fs.mkdirSync(authDir, { recursive: true });

  await waitForApiReady(request);
  await waitForWebReady(request);

  for (const role of roles) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signInSmokeRole(page, role);

      if (role === "ONBOARDING") {
        // Incomplete student must land on (or be gated to) onboarding.
        await expect(page).toHaveURL(/\/me(\/onboarding)?/);
      }

      await context.storageState({
        path: authFile(role),
        indexedDB: true,
      });
    } finally {
      await context.close();
    }
  }
});
