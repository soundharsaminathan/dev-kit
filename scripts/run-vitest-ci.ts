import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CI_TEST_PROJECTS,
  type CiTestProject,
  COVERAGE_INCLUDES,
  COVERAGE_THRESHOLDS,
  coverageReportsDir,
  isCoverageProject,
} from "../vitest.coverage.ts";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function isCiTestProject(value: string): value is CiTestProject {
  return (CI_TEST_PROJECTS as readonly string[]).includes(value);
}

export function buildVitestCiCommand(
  project: CiTestProject,
  options: { coverageOnly?: boolean } = {},
): string {
  const args = [
    "vitest run",
    "--config vitest.config.ts",
    `--project ${project}`,
  ];

  if (isCoverageProject(project)) {
    const reportsDir = coverageReportsDir(workspaceRoot, project);

    args.push(
      "--coverage.enabled=true",
      `--coverage.reportsDirectory=${reportsDir}`,
      ...COVERAGE_INCLUDES[project].flatMap((pattern) => [
        `--coverage.include=${pattern}`,
      ]),
      "--coverage.reporter=text",
      "--coverage.reporter=text-summary",
      "--coverage.reporter=html",
      "--coverage.reporter=lcov",
      "--coverage.reporter=json-summary",
      `--coverage.thresholds.lines=${COVERAGE_THRESHOLDS.lines}`,
      `--coverage.thresholds.statements=${COVERAGE_THRESHOLDS.statements}`,
      `--coverage.thresholds.functions=${COVERAGE_THRESHOLDS.functions}`,
      `--coverage.thresholds.branches=${COVERAGE_THRESHOLDS.branches}`,
    );
  } else if (options.coverageOnly) {
    throw new Error(
      `Project "${project}" does not collect coverage (browser suite only).`,
    );
  }

  if (!options.coverageOnly) {
    args.push(
      "--reporter=default",
      "--reporter=github-actions",
      "--reporter=junit",
      `--outputFile=test-results/junit-${project}.xml`,
    );
  }

  return args.join(" ");
}

export function runVitestCi(
  project: CiTestProject,
  options: { coverageOnly?: boolean } = {},
): void {
  const command = buildVitestCiCommand(project, options);

  execSync(`pnpm exec ${command}`, {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: process.env,
  });
}

export function runVitestCiFromArgv(argv: string[]): void {
  const projectArg = argv[0];
  const coverageOnly = argv.includes("--coverage-only");

  if (!projectArg || !isCiTestProject(projectArg)) {
    throw new Error(
      `Usage: pnpm exec tsx scripts/run-vitest-ci.ts <${CI_TEST_PROJECTS.join("|")}>`,
    );
  }

  runVitestCi(projectArg, { coverageOnly });
}

if (import.meta.url.endsWith(process.argv[1]?.replaceAll("\\", "/") ?? "")) {
  runVitestCiFromArgv(process.argv.slice(2));
}
