import path from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const webUrl = env.STEP_UP_WEB_URL ?? "https://step-up.pages.dev";
const isCI = Boolean(env.CI);

/**
 * Deployed smoke suite — hits the live Cloudflare Pages + Cloud Run stack.
 * No local webServer; auth uses real Firebase email/password accounts.
 */
export default defineConfig({
  testDir: path.join(dirname, "e2e/smoke"),
  testMatch: /.*\.(smoke\.spec|setup)\.ts/,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: 1,
  reporter: isCI
    ? [
        ["github"],
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report-smoke" }],
        ["junit", { outputFile: "test-results/junit-step-up-smoke.xml" }],
        [path.join(dirname, "e2e/smoke/reporters/performance-reporter.ts")],
      ]
    : [
        ["list"],
        [path.join(dirname, "e2e/smoke/reporters/performance-reporter.ts")],
      ],
  timeout: 90_000,
  expect: { timeout: 20_000 },
  metadata: {
    perfResultsFile: path.join(dirname, "playwright-results/performance.json"),
  },
  use: {
    baseURL: webUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
    timezoneId: "UTC",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    // Deterministic smoke perf measurements
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
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
        viewport: { width: 1280, height: 720 },
      },
      testIgnore: [/auth\.setup\.ts/],
    },
  ],
});
