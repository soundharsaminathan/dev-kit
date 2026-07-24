import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as setup } from "@playwright/test";
import {
  authFile,
  waitForApiReady,
  waitForWebReady,
  writeRoleStorageState,
} from "./fixtures";
import { SEED, type SeedRole } from "./fixtures/seed";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(dirname, ".auth");

const roles: SeedRole[] = ["OWNER", "STAFF", "TRAINER", "STUDENT", "PARENT"];

setup("authenticate roles", async ({ request, browser }) => {
  setup.setTimeout(120_000);
  fs.mkdirSync(authDir, { recursive: true });
  await waitForApiReady(request, "OWNER");
  await waitForWebReady(request);

  for (const role of roles) {
    writeRoleStorageState(role);
    if (!fs.existsSync(authFile(role))) {
      throw new Error(`Failed to write auth state for ${role}`);
    }
  }

  // Best-effort: pull critical code-split routes through Vite once so the
  // first parallel worker is not stuck on a cold transform. Never fail setup
  // if a single route is slow — tests still wait via waitForAppReady.
  const warmPaths = [
    { role: "STAFF" as const, path: "/app/batches" },
    { role: "STAFF" as const, path: "/app/batches/new" },
    { role: "STAFF" as const, path: "/app/payments" },
    { role: "STAFF" as const, path: "/app/invoices" },
    {
      role: "TRAINER" as const,
      path: `/app/sessions/${SEED.sessionAttendanceId}/attendance`,
    },
    { role: "STUDENT" as const, path: "/me" },
  ];

  for (const target of warmPaths) {
    const context = await browser.newContext({
      storageState: authFile(target.role),
    });
    const page = await context.newPage();
    try {
      await page.goto(target.path, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page
        .locator("#boot-splash, [data-boot-loader]")
        .waitFor({ state: "detached", timeout: 60_000 })
        .catch(() => undefined);
    } catch {
      // Ignore — individual tests assert readiness.
    } finally {
      await context.close();
    }
  }
});
