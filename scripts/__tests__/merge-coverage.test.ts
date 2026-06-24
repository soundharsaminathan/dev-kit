import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeCoverageTotal,
  mergeCoverageSummaries,
  mergeFileCoverage,
  mergeMetrics,
  readProjectCoverageSummaries,
  writeMergedCoverageSummary,
} from "../merge-coverage.ts";

const metrics = (total: number, covered: number) => ({
  total,
  covered,
  skipped: 0,
  pct: total === 0 ? 100 : (covered / total) * 100,
});

const fileCoverage = (
  lines: [number, number],
  statements: [number, number],
) => ({
  lines: metrics(...lines),
  functions: metrics(1, 1),
  statements: metrics(...statements),
  branches: metrics(2, 1),
});

describe("mergeMetrics", () => {
  it("combines metric totals and recalculates percentage", () => {
    expect(mergeMetrics(metrics(10, 8), metrics(5, 5))).toEqual({
      total: 15,
      covered: 13,
      skipped: 0,
      pct: (13 / 15) * 100,
    });
  });
});

describe("mergeFileCoverage", () => {
  it("merges all metric groups for a file", () => {
    const left = fileCoverage([4, 3], [6, 4]);
    const right = fileCoverage([2, 2], [4, 4]);

    expect(mergeFileCoverage(left, right).lines).toEqual(metrics(6, 5));
    expect(mergeFileCoverage(left, right).statements).toEqual(metrics(10, 8));
  });
});

describe("mergeCoverageSummaries", () => {
  it("merges unique files and recomputes total", () => {
    const merged = mergeCoverageSummaries([
      {
        "src/a.ts": fileCoverage([2, 2], [2, 2]),
        total: fileCoverage([2, 2], [2, 2]),
      },
      {
        "src/b.ts": fileCoverage([4, 2], [4, 2]),
        total: fileCoverage([4, 2], [4, 2]),
      },
    ]);

    expect(Object.keys(merged)).toEqual(["src/a.ts", "src/b.ts", "total"]);
    expect(merged["src/a.ts"]).toEqual(fileCoverage([2, 2], [2, 2]));
    expect(merged["src/b.ts"]).toEqual(fileCoverage([4, 2], [4, 2]));
    expect(merged.total).toEqual(
      computeCoverageTotal({
        "src/a.ts": merged["src/a.ts"],
        "src/b.ts": merged["src/b.ts"],
      }),
    );
  });

  it("combines duplicate file entries across summaries", () => {
    const merged = mergeCoverageSummaries([
      {
        "src/shared.ts": fileCoverage([2, 1], [2, 1]),
      },
      {
        "src/shared.ts": fileCoverage([2, 2], [2, 2]),
      },
    ]);

    expect(merged["src/shared.ts"].lines).toEqual(metrics(4, 3));
    expect(merged["src/shared.ts"].statements).toEqual(metrics(4, 3));
  });
});

describe("readProjectCoverageSummaries", () => {
  it("reads per-project coverage summaries from disk", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-coverage-"));
    const scriptsSummaryDir = path.join(tempDir, "coverage", "scripts");
    fs.mkdirSync(scriptsSummaryDir, { recursive: true });
    fs.writeFileSync(
      path.join(scriptsSummaryDir, "coverage-summary.json"),
      JSON.stringify({
        "scripts/example.ts": fileCoverage([2, 2], [2, 2]),
      }),
    );

    const summaries = readProjectCoverageSummaries(tempDir);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]["scripts/example.ts"]).toEqual(
      fileCoverage([2, 2], [2, 2]),
    );
  });
});

describe("writeMergedCoverageSummary", () => {
  it("merges project summaries into coverage/coverage-summary.json", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-coverage-"));
    const coreSummaryDir = path.join(tempDir, "coverage", "core");
    fs.mkdirSync(coreSummaryDir, { recursive: true });
    fs.writeFileSync(
      path.join(coreSummaryDir, "coverage-summary.json"),
      JSON.stringify({
        "src/a.ts": fileCoverage([2, 2], [2, 2]),
      }),
    );

    const merged = writeMergedCoverageSummary(tempDir);
    const output = JSON.parse(
      fs.readFileSync(
        path.join(tempDir, "coverage", "coverage-summary.json"),
        "utf8",
      ),
    ) as typeof merged;

    expect(merged["src/a.ts"]).toEqual(fileCoverage([2, 2], [2, 2]));
    expect(output.total).toEqual(merged.total);
  });

  it("throws when no project summaries exist", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-coverage-"));

    expect(() => writeMergedCoverageSummary(tempDir)).toThrow(
      "No project coverage summaries found",
    );
  });
});
