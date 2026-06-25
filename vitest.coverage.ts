import path from "node:path";

export const COVERAGE_PROJECTS = [
  "core",
  "components",
  "tokens",
  "showcase",
  "storybook",
  "scripts",
] as const;

export type CoverageProject = (typeof COVERAGE_PROJECTS)[number];

export const LIB_COVERAGE_PROJECTS = [
  "core",
  "components",
  "tokens",
] as const satisfies readonly CoverageProject[];

export type LibCoverageProject = (typeof LIB_COVERAGE_PROJECTS)[number];

export interface CoverageThresholds {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

/** Minimum coverage enforced in CI for library packages. */
export const COVERAGE_THRESHOLDS: Record<
  LibCoverageProject,
  CoverageThresholds
> = {
  core: {
    lines: 70,
    statements: 70,
    functions: 65,
    branches: 60,
  },
  components: {
    lines: 90,
    statements: 90,
    functions: 90,
    branches: 80,
  },
  tokens: {
    lines: 50,
    statements: 50,
    functions: 50,
    branches: 35,
  },
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
  showcase: ["src/**/*.{ts,tsx}"],
  scripts: ["**/*.{ts,tsx}"],
  storybook: ["../../packages/components/src/**/*.{ts,tsx}"],
};
