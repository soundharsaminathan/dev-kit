import { createRequire } from "node:module";
import path from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
createRequire(import.meta.url)(
  path.join(dirname, "../../scripts/resolve-color-env-conflict.cjs"),
);
const webUrl = env.STEP_UP_WEB_URL ?? "https://step-up.pages.dev";
const isCI = Boolean(env.CI);

/**
 * Deployed smoke suite — hits the live Cloudflare Pages + Cloud Run stack.
 * No local webServer; auth uses real Firebase email/password accounts.
 */
export default defineConfig({
  testDir: path.join(dirname, "e2e/smoke"),
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: 1,
  reporter: isCI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report-smoke" }],
        ["junit", { outputFile: "test-results/junit-step-up-smoke.xml" }],
      ]
    : "list",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: webUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
    timezoneId: "UTC",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "smoke-setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "smoke",
      dependencies: ["smoke-setup"],
      use: {
        ...devices["Desktop Chrome"],
      },
      testIgnore: [/auth\.setup\.ts/],
    },
  ],
});
