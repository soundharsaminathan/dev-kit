import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const coverageExclude = [
  "**/__tests__/**",
  "**/*.test.{ts,tsx}",
  "**/*.types.ts",
  "**/index.ts",
  "**/main.tsx",
  "**/generate-scss.ts",
  "**/*.module.scss",
  "**/scss-modules.d.ts",
  "scripts/vite/**",
];

const coverageReporters = [
  "text",
  "text-summary",
  "html",
  "lcov",
  "json-summary",
] as const;

const sharedCoverage = {
  provider: "v8" as const,
  reporter: [...coverageReporters],
  exclude: coverageExclude,
};

export default defineConfig({
  test: {
    maxWorkers: 4,
    coverage: sharedCoverage,
    projects: [
      {
        test: {
          name: "tokens",
          root: path.join(rootDir, "packages/tokens"),
          environment: "node",
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: "core",
          root: path.join(rootDir, "packages/core"),
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["dist/**"],
          environment: "node",
          sequence: { groupOrder: 2 },
        },
      },
      {
        test: {
          name: "components",
          root: path.join(rootDir, "packages/components"),
          environment: "jsdom",
          env: {
            VIRT_ON: "1",
          },
          css: true,
          globals: true,
          setupFiles: [path.join(rootDir, "vitest.setup.ts")],
          testTimeout: 15_000,
          hookTimeout: 15_000,
          sequence: { groupOrder: 2 },
        },
        resolve: {
          alias: {
            "@": path.join(rootDir, "packages/components/src"),
          },
        },
      },
      {
        test: {
          name: "showcase",
          root: path.join(rootDir, "apps/showcase"),
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["e2e/**"],
          environment: "jsdom",
          css: true,
          globals: true,
          setupFiles: [
            path.join(rootDir, "vitest.setup.ts"),
            path.join(rootDir, "apps/showcase/vitest.setup.ts"),
          ],
          testTimeout: 30_000,
          hookTimeout: 30_000,
          sequence: { groupOrder: 2 },
        },
        resolve: {
          alias: {
            "@": path.join(rootDir, "apps/showcase/src"),
          },
        },
      },
      path.join(rootDir, "apps/storybook/vitest.config.ts"),
      {
        test: {
          name: "scripts",
          root: path.join(rootDir, "scripts"),
          environment: "node",
          testTimeout: 15_000,
          fileParallelism: false,
          sequence: { groupOrder: 4 },
        },
      },
    ],
  },
});
