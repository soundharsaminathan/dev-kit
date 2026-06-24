import path from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(dirname, "../..");
const showcasePort = Number(env.SHOWCASE_PORT ?? 5173);
const showcaseUrl = env.SHOWCASE_URL ?? `http://localhost:${showcasePort}`;
const isCI = Boolean(env.CI);

const chromiumArgs = [
  "--font-render-hinting=none",
  "--disable-font-subpixel-positioning",
  "--force-color-profile=srgb",
] as const;

const chromiumUse = {
  ...devices["Desktop Chrome"],
  launchOptions: {
    args: [...chromiumArgs],
  },
};

export default defineConfig({
  testDir: path.join(dirname, "e2e"),
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 2 } : {}),
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: isCI ? 0.02 : 0.01,
      stylePath: path.join(dirname, "e2e/screenshot.css"),
    },
  },
  use: {
    baseURL: showcaseUrl,
    trace: "on-first-retry",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...chromiumUse,
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    command:
      "pnpm --filter @dev-ui/tokens run generate-scss && pnpm --filter @dev-ui/showcase run dev",
    cwd: workspaceRoot,
    url: showcaseUrl,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
