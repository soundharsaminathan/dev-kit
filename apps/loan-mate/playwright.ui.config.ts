import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.LOAN_MATE_WEB_PORT ?? 5182);
const baseURL = `http://127.0.0.1:${port}`;
const isCI = Boolean(process.env.CI);

/**
 * Browser tests for the staff app. They do not need the API: a local session
 * is enough to open the shell and follow navigation.
 */
export default defineConfig({
  testDir: path.join(dirname, "e2e/ui"),
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Pixel 5"],
  },
  webServer: {
    command: `pnpm exec vite --port ${port} --host 127.0.0.1 --strictPort`,
    cwd: dirname,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
