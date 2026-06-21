import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function formatMetricRow(label: string, metrics: CoverageMetrics): string {
  return `| ${label} | ${metrics.covered}/${metrics.total} | ${metrics.pct.toFixed(2)}% |`;
}

export function formatCoverageComment(
  summary: CoverageSummary & { total: FileCoverage },
): string {
  const { total } = summary;

  if (!total) {
    throw new Error("coverage-summary.json is missing a total entry");
  }

  return [
    "## dev-kit coverage",
    "",
    "| Metric | Covered | % |",
    "| --- | --- | --- |",
    formatMetricRow("Statements", total.statements),
    formatMetricRow("Branches", total.branches),
    formatMetricRow("Functions", total.functions),
    formatMetricRow("Lines", total.lines),
    "",
    "Download the full HTML report from the `coverage-report` workflow artifact.",
  ].join("\n");
}

export function writeCoverageComment(
  summaryPath = path.join(workspaceRoot, "coverage", "coverage-summary.json"),
  outputPath = path.join(workspaceRoot, "coverage-comment.md"),
): string {
  const summary = JSON.parse(
    fs.readFileSync(summaryPath, "utf8"),
  ) as CoverageSummary & { total: FileCoverage };
  const comment = `${formatCoverageComment(summary)}\n`;

  fs.writeFileSync(outputPath, comment);

  return comment;
}

if (import.meta.url.endsWith(process.argv[1]?.replaceAll("\\", "/") ?? "")) {
  writeCoverageComment();
}
