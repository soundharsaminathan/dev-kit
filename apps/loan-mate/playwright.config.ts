import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { apiBaseUrl, apiPort, e2eDatabaseUrl } from "./e2e/env";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(dirname, "../..");
const apiRoot = path.join(workspaceRoot, "apps/loan-mate-api");
const isCI = Boolean(process.env.CI);

/**
 * Flow-level HTTP tests. The web server prepares a dedicated database, seeds
 * the staff roles, and starts the API with AUTH_BYPASS. Specs talk to that API
 * the way the staff app does.
 */
export default defineConfig({
  testDir: path.join(dirname, "e2e/http"),
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["list"]] : "list",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  webServer: {
    command: [
      "pnpm exec tsx scripts/prepare-e2e-db.ts",
      "pnpm exec prisma generate",
      "pnpm exec prisma migrate deploy",
      "pnpm exec tsx prisma/seed.ts",
      "pnpm exec nest build",
      "node dist/main.js",
    ].join(" && "),
    cwd: apiRoot,
    url: `${apiBaseUrl}/health`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      ...process.env,
      PORT: String(apiPort),
      AUTH_BYPASS: "true",
      NODE_ENV: "development",
      DATABASE_URL: e2eDatabaseUrl,
      DIRECT_DATABASE_URL: e2eDatabaseUrl,
    },
  },
});
