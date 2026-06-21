import type { StorybookConfig } from "@storybook/react-vite";

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
};

export default config;
