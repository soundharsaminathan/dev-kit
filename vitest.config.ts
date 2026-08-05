import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const testExclude = ["**/dist/**", "**/node_modules/**", "**/e2e/**"];

const coverageExclude = [
  "**/__tests__/**",
  "**/*.test.{ts,tsx}",
  "**/*.types.ts",
  "**/index.ts",
  "**/main.tsx",
  "**/generate-scss.ts",
  "**/*.module.scss",
  "**/scss-modules.d.ts",
  "**/generated/**",
  "**/*.generated.ts",
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
    exclude: testExclude,
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
          name: "icons",
          root: path.join(rootDir, "packages/icons"),
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: testExclude,
          environment: "jsdom",
          css: true,
          globals: true,
          setupFiles: [path.join(rootDir, "vitest.setup.ts")],
          sequence: { groupOrder: 2 },
        },
      },
      {
        test: {
          name: "core",
          root: path.join(rootDir, "packages/core"),
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: testExclude,
          environment: "node",
          sequence: { groupOrder: 2 },
        },
      },
      {
        test: {
          name: "components",
          root: path.join(rootDir, "packages/components"),
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: testExclude,
          environment: "jsdom",
          env: {
            VIRT_ON: "1",
          },
          css: true,
          globals: true,
          testTimeout: 15_000,
          hookTimeout: 15_000,
          sequence: { groupOrder: 2 },
          setupFiles: [
            path.join(rootDir, "vitest.setup.ts"),
            path.join(rootDir, "packages/components/vitest.setup.tsx"),
          ],
        },
        resolve: {
          alias: {
            "@": path.join(rootDir, "packages/components/src"),
            "@dev-ui/icons-packs/lucide": path.join(
              rootDir,
              "packages/icons-packs/src/lucide/index.tsx",
            ),
          },
        },
      },
      {
        test: {
          name: "showcase",
          root: path.join(rootDir, "apps/showcase"),
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: [...testExclude, "e2e/**"],
          environment: "jsdom",
          css: true,
          globals: true,
          setupFiles: [
            path.join(rootDir, "vitest.setup.ts"),
            path.join(rootDir, "apps/showcase/vitest.setup.ts"),
          ],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          sequence: { groupOrder: 2 },
        },
        resolve: {
          alias: {
            "@": path.join(rootDir, "apps/showcase/src"),
          },
        },
      },
      {
        test: {
          name: "portfolio",
          root: path.join(rootDir, "apps/portfolio"),
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: [...testExclude, "e2e/**"],
          environment: "jsdom",
          css: true,
          globals: true,
          setupFiles: [
            path.join(rootDir, "vitest.setup.ts"),
            path.join(rootDir, "apps/portfolio/vitest.setup.ts"),
          ],
          testTimeout: 30_000,
          hookTimeout: 30_000,
          sequence: { groupOrder: 2 },
        },
        resolve: {
          alias: {
            "@": path.join(rootDir, "apps/portfolio/src"),
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
          pool: "forks",
          sequence: { groupOrder: 4 },
        },
      },
    ],
  },
});
