import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { coverageReportsDir } from "./vitest.coverage.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const coverageExclude = [
  "**/__tests__/**",
  "**/*.test.{ts,tsx}",
  "**/*.types.ts",
  "**/index.ts",
  "**/*.module.scss",
  "**/scss-modules.d.ts",
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
    projects: [
      {
        test: {
          name: "core",
          root: path.join(rootDir, "packages/core"),
          environment: "node",
          sequence: { groupOrder: 0 },
          coverage: {
            ...sharedCoverage,
            reportsDirectory: coverageReportsDir(rootDir, "core"),
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
            ...sharedCoverage,
            reportsDirectory: coverageReportsDir(rootDir, "components"),
            include: ["src/**/*.{ts,tsx}"],
          },
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
          testTimeout: 15_000,
          hookTimeout: 15_000,
          sequence: { groupOrder: 2 },
          coverage: {
            ...sharedCoverage,
            reportsDirectory: coverageReportsDir(rootDir, "showcase"),
            include: ["src/**/*.{ts,tsx}"],
          },
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
          sequence: { groupOrder: 3 },
          coverage: {
            ...sharedCoverage,
            reportsDirectory: coverageReportsDir(rootDir, "scripts"),
            include: ["**/*.{ts,tsx}"],
            exclude: [...coverageExclude, "**/__tests__/**"],
          },
        },
      },
    ],
  },
});
