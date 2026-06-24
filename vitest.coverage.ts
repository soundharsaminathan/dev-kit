import path from "node:path";

export const COVERAGE_PROJECTS = [
  "core",
  "components",
  "showcase",
  "storybook",
  "scripts",
] as const;

export type CoverageProject = (typeof COVERAGE_PROJECTS)[number];

export function coverageReportsDir(
  workspaceRoot: string,
  project: CoverageProject,
): string {
  return path.join(workspaceRoot, "coverage", project);
}

export const COVERAGE_INCLUDES: Record<CoverageProject, readonly string[]> = {
  core: ["src/**/*.{ts,tsx}"],
  components: ["src/**/*.{ts,tsx}"],
  showcase: ["src/**/*.{ts,tsx}"],
  scripts: ["**/*.{ts,tsx}"],
  storybook: ["../../packages/components/src/**/*.{ts,tsx}"],
};
