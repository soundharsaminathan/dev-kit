import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const coverageExclude = [
  "**/__tests__/**",
  "**/*.test.{ts,tsx}",
  "**/*.types.ts",
  "**/index.ts",
  "**/*.module.scss",
  "**/scss-modules.d.ts",
];

export default defineConfig({
  test: {
    maxWorkers: 4,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: path.join(rootDir, "coverage"),
      exclude: coverageExclude,
    },
    projects: [
      {
        test: {
          name: "core",
          root: path.join(rootDir, "packages/core"),
          environment: "node",
          sequence: { groupOrder: 0 },
          coverage: {
            reportsDirectory: "./coverage",
            include: ["src/**/*.{ts,tsx}"],
          },
        },
      },
      {
        test: {
          name: "components",
          root: path.join(rootDir, "packages/components"),
          environment: "jsdom",
          css: true,
          globals: true,
          setupFiles: [path.join(rootDir, "vitest.setup.ts")],
          testTimeout: 15_000,
          hookTimeout: 15_000,
          sequence: { groupOrder: 1 },
          coverage: {
            reportsDirectory: "./coverage",
            include: ["src/**/*.{ts,tsx}"],
          },
        },
        resolve: {
          alias: {
            "@": path.join(rootDir, "packages/components/src"),
          },
        },
      },
      path.join(rootDir, "apps/storybook/vitest.config.ts"),
      {
        test: {
          name: "scripts",
          root: path.join(rootDir, "scripts"),
          environment: "node",
          sequence: { groupOrder: 3 },
        },
      },
    ],
  },
});
