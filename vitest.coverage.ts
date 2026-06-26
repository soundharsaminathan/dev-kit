import path from "node:path";

export const COVERAGE_PROJECTS = [
  "core",
  "components",
  "tokens",
  "icons",
  "showcase",
  "storybook",
  "scripts",
] as const;

export type CoverageProject = (typeof COVERAGE_PROJECTS)[number];

export const LIB_COVERAGE_PROJECTS = [
  "core",
  "components",
  "tokens",
  "icons",
] as const satisfies readonly CoverageProject[];

export type LibCoverageProject = (typeof LIB_COVERAGE_PROJECTS)[number];

export interface CoverageThresholds {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

/** Minimum coverage enforced in CI for all packages and apps. */
export const COVERAGE_THRESHOLDS: CoverageThresholds = {
  lines: 90,
  statements: 90,
  functions: 90,
  branches: 90,
};

export function coverageReportsDir(
  workspaceRoot: string,
  project: CoverageProject,
): string {
  return path.join(workspaceRoot, "coverage", project);
}

export const COVERAGE_INCLUDES: Record<CoverageProject, readonly string[]> = {
  core: ["src/**/*.{ts,tsx}"],
  components: ["src/**/*.{ts,tsx}"],
  tokens: ["src/**/*.ts"],
  icons: ["src/**/*.{ts,tsx}"],
  showcase: ["src/**/*.{ts,tsx}"],
  scripts: ["**/*.{ts,tsx}"],
  storybook: ["src/**/*.{ts,tsx}"],
};
