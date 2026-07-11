import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import {
  CORE_OPTIMIZE_DEPS,
  devAppOptimizeDeps,
} from "../../scripts/vite/dev-app.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const vitestSetup = path.join(dirname, ".storybook/vitest.setup.ts");
const isCI = Boolean(process.env.CI);

export default defineConfig({
  optimizeDeps: {
    ...devAppOptimizeDeps,
    include: [
      ...CORE_OPTIMIZE_DEPS,
      "storybook/test",
      "msw-storybook-addon",
      "mockdate",
      "lucide-react",
      "motion/react",
      "@dev-ui/components/popover",
      "@dev-ui/components/styles",
    ],
  },
  server: {
    warmup: {
      clientFiles: [vitestSetup],
    },
  },
  plugins: [
    storybookTest({
      configDir: path.join(dirname, ".storybook"),
      storybookScript:
        "pnpm --filter @dev-ui/tokens run generate-scss && pnpm --filter @dev-ui/storybook run storybook -- --no-open",
      tags: {
        include: ["ai-generated"],
      },
    }),
  ],
  test: {
    name: "storybook",
    sequence: { groupOrder: 2 },
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    retry: isCI ? 1 : 0,
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          args: [
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-extensions",
          ],
        },
      }),
      headless: true,
      screenshotFailures: false,
      instances: [{ browser: "chromium" }],
    },
    setupFiles: [vitestSetup],
  },
});
