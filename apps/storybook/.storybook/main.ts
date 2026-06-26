import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import { devAppOptimizeDeps } from "../../../scripts/vite/dev-app.ts";

const isPlaywrightE2E = process.env.STORYBOOK_PLAYWRIGHT_E2E === "1";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: [
    ...(isPlaywrightE2E ? [] : ["@storybook/addon-a11y"]),
    "@storybook/addon-vitest",
  ],
  staticDirs: ["../public"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      optimizeDeps: devAppOptimizeDeps,
    });
  },
};

export default config;
