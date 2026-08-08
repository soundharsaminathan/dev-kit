/**
 * Seed Chrome user-data profiles for authenticated Lighthouse.
 *
 * Real Firebase email/password login (no bypass). Profiles keep IndexedDB auth
 * and are HTTP-cache-cleared so each Lighthouse cold load stays honest.
 *
 * Requires:
 *   STEP_UP_SMOKE_PASSWORD
 *
 * Usage:
 *   STEP_UP_SMOKE_PASSWORD=… node scripts/setup-lighthouse-auth.mjs \
 *     --base-url=http://127.0.0.1:4173
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(dirname, "../e2e/smoke/.auth");
const profilesDir = path.join(authDir, "chrome-profiles");

const USERS = {
  STUDENT: {
    email: "smoke-student@stepup.dev",
    home: /\/me/,
  },
  OWNER: {
    email: "smoke-owner@stepup.dev",
    home: /\/app/,
  },
};

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const baseUrl = (
  arg("base-url", process.env.STEP_UP_WEB_URL ?? "http://127.0.0.1:4173")
).replace(/\/$/, "");
const password = process.env.STEP_UP_SMOKE_PASSWORD;
if (!password) {
  console.error("STEP_UP_SMOKE_PASSWORD is required");
  process.exit(1);
}

fs.mkdirSync(profilesDir, { recursive: true });
fs.mkdirSync(authDir, { recursive: true });

async function login(page, email, home) {
  await page.goto(`${baseUrl}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByLabel(/email or username/i).waitFor({
    state: "visible",
    timeout: 60_000,
  });
  await page.getByLabel(/email or username/i).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page
    .getByRole("main")
    .getByRole("button", { name: /^sign in$/i })
    .click();

  await page.waitForFunction(
    (reSource) => new RegExp(reSource).test(location.pathname),
    home.source,
    { timeout: 90_000 },
  );
  await page.getByRole("heading").first().waitFor({
    state: "visible",
    timeout: 60_000,
  });
}

async function clearHttpCachesKeepAuth(page) {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.clearBrowserCache");
  await page.evaluate(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      // ignore
    }
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // ignore
    }
  });
}

for (const [role, user] of Object.entries(USERS)) {
  const profileDir = path.join(profilesDir, role.toLowerCase());
  fs.rmSync(profileDir, { recursive: true, force: true });
  fs.mkdirSync(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    channel: process.env.CHROME_PATH ? undefined : "chrome",
    executablePath: process.env.CHROME_PATH || undefined,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    const page = await context.newPage();
    await login(page, user.email, user.home);
    console.log(`logged in ${role} → ${page.url()}`);

    // Also keep Playwright storageState for debugging / non-LH tools.
    await context.storageState({
      path: path.join(authDir, `${role.toLowerCase()}.json`),
      indexedDB: true,
    });

    await clearHttpCachesKeepAuth(page);
    await page.close();
  } finally {
    await context.close();
  }

  console.log(`wrote chrome profile ${profileDir}`);
}

console.log("done");
