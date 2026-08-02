import path from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(dirname, "../..");

function portFromUrl(url: string | undefined, fallback: number) {
  if (!url) return fallback;
  try {
    const port = Number(new URL(url).port);
    return Number.isFinite(port) && port > 0 ? port : fallback;
  } catch {
    return fallback;
  }
}

// Dedicated defaults so local `dev` on 3000/5180 cannot poison auth bypass.
const apiPort = Number(
  env.STEP_UP_API_PORT ?? portFromUrl(env.STEP_UP_API_URL, 3199),
);
const webPort = Number(
  env.STEP_UP_WEB_PORT ?? portFromUrl(env.STEP_UP_WEB_URL, 5199),
);
const webUrl = env.STEP_UP_WEB_URL ?? `http://localhost:${webPort}`;
const apiUrl = env.STEP_UP_API_URL ?? `http://localhost:${apiPort}`;
const isCI = Boolean(env.CI);
const isNightly = env.STEP_UP_E2E_NIGHTLY === "true";
const reuseServers = !isCI && env.STEP_UP_E2E_REUSE === "true";

export default defineConfig({
  testDir: path.join(dirname, "e2e"),
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 2 : 3,
  reporter: isCI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["junit", { outputFile: "test-results/junit-step-up-e2e.xml" }],
      ]
    : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: webUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "http",
      dependencies: ["setup"],
      testMatch: /e2e\/http\/.*\.spec\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
      },
      testIgnore: [/auth\.setup\.ts/, /e2e\/http\//],
    },
    ...(isNightly
      ? [
          {
            name: "firefox",
            dependencies: ["setup"],
            use: {
              ...devices["Desktop Firefox"],
            },
            testIgnore: [/auth\.setup\.ts/, /e2e\/http\//],
          },
          {
            name: "webkit",
            dependencies: ["setup"],
            use: {
              ...devices["Desktop Safari"],
            },
            testIgnore: [/auth\.setup\.ts/, /e2e\/http\//],
          },
          {
            name: "mobile-chrome",
            dependencies: ["setup"],
            use: {
              ...devices["Pixel 5"],
            },
            testMatch:
              /role-shells|student-home|onboarding-gate|student-attendance/,
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: "pnpm exec nest build && node dist/main.js",
      cwd: path.join(workspaceRoot, "apps/step-up-api"),
      url: `${apiUrl}/health`,
      reuseExistingServer: reuseServers,
      timeout: 180_000,
      env: {
        ...env,
        PORT: String(apiPort),
        AUTH_BYPASS: "true",
        NODE_ENV: "development",
        // Explicit disable — empty SENTRY_DSN is dropped by some shells and
        // dotenv would re-apply the real DSN from apps/step-up-api/.env.
        SENTRY_DISABLED: "true",
        SENTRY_ENVIRONMENT: "e2e",
        STEP_UP_E2E: "true",
        SENTRY_DSN: "",
        // E2E disables BullMQ — app .env may still point at a quota-exhausted Redis.
        REDIS_URL: "",
        // Keep checkout on the local demo path; real Razorpay keys break CI mocks.
        RAZORPAY_KEY_ID: "",
        RAZORPAY_KEY_SECRET: "",
      },
    },
    {
      // Keep Vite's dep cache — wiping it every run forces cold optimizeDeps and
      // makes first navigations hang on DanceLoader/chunk fetch under parallel workers.
      command: `pnpm exec vite --host 127.0.0.1 --port ${webPort} --strictPort`,
      cwd: path.join(workspaceRoot, "apps/step-up"),
      url: webUrl,
      reuseExistingServer: reuseServers,
      timeout: 180_000,
      env: {
        ...env,
        STEP_UP_E2E: "true",
        VITE_API_URL: apiUrl,
        VITE_AUTH_BYPASS: "true",
        VITE_SENTRY_DSN: "",
      },
    },
  ],
});
