import path from "node:path";

export const COVERAGE_PROJECTS = [
  "core",
  "components",
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
