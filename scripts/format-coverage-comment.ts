import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  coverageReportsDir,
  LIB_COVERAGE_PROJECTS,
  type LibCoverageProject,
} from "../vitest.coverage.ts";

interface CoverageMetrics {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

interface FileCoverage {
  lines: CoverageMetrics;
  functions: CoverageMetrics;
  statements: CoverageMetrics;
  branches: CoverageMetrics;
}

type CoverageSummary = Record<string, FileCoverage>;

export interface LibCoverageSummary {
  project: LibCoverageProject;
  total: FileCoverage;
}

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function formatMetricRow(label: string, metrics: CoverageMetrics): string {
  return `| ${label} | ${metrics.covered}/${metrics.total} | ${metrics.pct.toFixed(2)}% |`;
}

function formatCoverageTable(total: FileCoverage): string[] {
  return [
    "| Metric | Covered | % |",
    "| --- | --- | --- |",
    formatMetricRow("Statements", total.statements),
    formatMetricRow("Branches", total.branches),
    formatMetricRow("Functions", total.functions),
    formatMetricRow("Lines", total.lines),
  ];
}

export function readLibCoverageSummaries(
  rootDir = workspaceRoot,
): LibCoverageSummary[] {
  const summaries: LibCoverageSummary[] = [];

  for (const project of LIB_COVERAGE_PROJECTS) {
    const summaryPath = path.join(
      coverageReportsDir(rootDir, project),
      "coverage-summary.json",
    );

    if (!fs.existsSync(summaryPath)) {
      continue;
    }

    const summary = JSON.parse(
      fs.readFileSync(summaryPath, "utf8"),
    ) as CoverageSummary & { total?: FileCoverage };

    if (!summary.total) {
      continue;
    }

    summaries.push({ project, total: summary.total });
  }

  return summaries;
}

export function formatCoverageComment(
  summary: CoverageSummary & { total: FileCoverage },
  libSummaries: readonly LibCoverageSummary[] = [],
): string {
  const { total } = summary;

  if (!total) {
    throw new Error("coverage-summary.json is missing a total entry");
  }

  const sections = ["## dev-kit coverage", "", ...formatCoverageTable(total)];

  if (libSummaries.length > 0) {
    sections.push("", "## Libraries", "");

    for (const { project, total: libTotal } of libSummaries) {
      sections.push(`### ${project}`, "", ...formatCoverageTable(libTotal), "");
    }
  }

  sections.push(
    "Download the full HTML report from the `coverage-report` workflow artifact.",
  );

  return sections.join("\n");
}

export function writeCoverageComment(
  summaryPath = path.join(workspaceRoot, "coverage", "coverage-summary.json"),
  outputPath = path.join(workspaceRoot, "coverage-comment.md"),
): string {
  const summary = JSON.parse(
    fs.readFileSync(summaryPath, "utf8"),
  ) as CoverageSummary & { total: FileCoverage };
  const libSummaries = readLibCoverageSummaries(
    path.resolve(summaryPath, "..", ".."),
  );
  const comment = `${formatCoverageComment(summary, libSummaries)}\n`;

  fs.writeFileSync(outputPath, comment);

  return comment;
}

if (import.meta.url.endsWith(process.argv[1]?.replaceAll("\\", "/") ?? "")) {
  writeCoverageComment();
}
