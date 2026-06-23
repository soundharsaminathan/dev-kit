import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  optimizeDeps: {
    include: [
      "storybook/test",
      "msw-storybook-addon",
      "mockdate",
      "@dev-ui/components/popover",
    ],
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
    browser: {
      enabled: true,
      provider: playwright({}),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
    setupFiles: [path.join(dirname, ".storybook/vitest.setup.ts")],
  },
});
