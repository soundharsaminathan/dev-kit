import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COVERAGE_PROJECTS, coverageReportsDir } from "../vitest.coverage.ts";

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

function isFileCoverage(value: unknown): value is FileCoverage {
  return (
    typeof value === "object" &&
    value !== null &&
    "lines" in value &&
    "functions" in value &&
    "statements" in value &&
    "branches" in value
  );
}

export function mergeMetrics(
  left: CoverageMetrics,
  right: CoverageMetrics,
): CoverageMetrics {
  const total = left.total + right.total;
  const covered = left.covered + right.covered;
  const skipped = left.skipped + right.skipped;

  return {
    total,
    covered,
    skipped,
    pct: total === 0 ? 100 : (covered / total) * 100,
  };
}

export function mergeFileCoverage(
  left: FileCoverage,
  right: FileCoverage,
): FileCoverage {
  return {
    lines: mergeMetrics(left.lines, right.lines),
    functions: mergeMetrics(left.functions, right.functions),
    statements: mergeMetrics(left.statements, right.statements),
    branches: mergeMetrics(left.branches, right.branches),
  };
}

export function computeCoverageTotal(
  files: Record<string, FileCoverage>,
): FileCoverage {
  const empty: CoverageMetrics = { total: 0, covered: 0, skipped: 0, pct: 100 };

  return Object.values(files).reduce<FileCoverage>(
    (total, file) => mergeFileCoverage(total, file),
    {
      lines: { ...empty },
      functions: { ...empty },
      statements: { ...empty },
      branches: { ...empty },
    },
  );
}

export function mergeCoverageSummaries(
  summaries: CoverageSummary[],
): CoverageSummary & { total: FileCoverage } {
  const mergedFiles: Record<string, FileCoverage> = {};

  for (const summary of summaries) {
    for (const [filePath, coverage] of Object.entries(summary)) {
      if (filePath === "total" || !isFileCoverage(coverage)) {
        continue;
      }

      mergedFiles[filePath] = mergedFiles[filePath]
        ? mergeFileCoverage(mergedFiles[filePath], coverage)
        : { ...coverage };
    }
  }

  return {
    ...mergedFiles,
    total: computeCoverageTotal(mergedFiles),
  };
}

export function readProjectCoverageSummaries(
  rootDir = workspaceRoot,
): CoverageSummary[] {
  const summaries: CoverageSummary[] = [];

  for (const project of COVERAGE_PROJECTS) {
    const summaryPath = path.join(
      coverageReportsDir(rootDir, project),
      "coverage-summary.json",
    );

    if (!fs.existsSync(summaryPath)) {
      continue;
    }

    summaries.push(
      JSON.parse(fs.readFileSync(summaryPath, "utf8")) as CoverageSummary,
    );
  }

  return summaries;
}

export function mergeLcovReports(rootDir = workspaceRoot): string | null {
  const parts: string[] = [];

  for (const project of COVERAGE_PROJECTS) {
    const lcovPath = path.join(
      coverageReportsDir(rootDir, project),
      "lcov.info",
    );

    if (!fs.existsSync(lcovPath)) {
      continue;
    }

    parts.push(fs.readFileSync(lcovPath, "utf8").trimEnd());
  }

  if (parts.length === 0) {
    return null;
  }

  const outputDir = path.join(rootDir, "coverage");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "lcov.info");
  fs.writeFileSync(outputPath, `${parts.join("\n")}\n`);

  return outputPath;
}

export function writeMergedCoverageSummary(
  rootDir = workspaceRoot,
): CoverageSummary & { total: FileCoverage } {
  const summaries = readProjectCoverageSummaries(rootDir);

  if (summaries.length === 0) {
    throw new Error(
      `No project coverage summaries found under ${path.join(rootDir, "coverage")}`,
    );
  }

  const merged = mergeCoverageSummaries(summaries);
  const outputDir = path.join(rootDir, "coverage");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "coverage-summary.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`);
  mergeLcovReports(rootDir);

  return merged;
}

if (import.meta.url.endsWith(process.argv[1]?.replaceAll("\\", "/") ?? "")) {
  writeMergedCoverageSummary();
}
