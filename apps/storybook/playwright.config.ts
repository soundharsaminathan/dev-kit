import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { RESPONSIVE_TAG, VIEWPORTS } from "./e2e/helpers/viewports";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const storybookPort = Number(process.env.STORYBOOK_PORT ?? 6006);
const storybookUrl =
  process.env.STORYBOOK_URL ?? `http://localhost:${storybookPort}`;

const chromiumUse = {
  ...devices["Desktop Chrome"],
  launchOptions: {
    args: ["--font-render-hinting=none"],
  },
};

export default defineConfig({
  testDir: path.join(dirname, "e2e"),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  use: {
    baseURL: storybookUrl,
    trace: "on-first-retry",
    locale: "en-US",
    timezoneId: "UTC",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...chromiumUse,
        viewport: VIEWPORTS.desktop,
      },
    },
    {
      name: "chromium-tablet",
      grep: new RegExp(RESPONSIVE_TAG),
      use: {
        ...chromiumUse,
        viewport: VIEWPORTS.tablet,
      },
    },
    {
      name: "chromium-mobile",
      grep: new RegExp(RESPONSIVE_TAG),
      use: {
        ...chromiumUse,
        viewport: VIEWPORTS.mobile,
      },
    },
  ],
  webServer: {
    command:
      "pnpm --filter @dev-ui/tokens run generate-scss && pnpm exec storybook dev -p 6006",
    cwd: dirname,
    url: storybookUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
