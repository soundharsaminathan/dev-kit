import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  computeCoverageTotal,
  mergeCoverageSummaries,
  mergeFileCoverage,
  mergeLcovReports,
  mergeMetrics,
} from "../merge-coverage.ts";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-kit-coverage-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

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

describe("mergeLcovReports", () => {
  it("concatenates project lcov files into coverage/lcov.info", () => {
    const rootDir = makeTempDir();
    const coreDir = path.join(rootDir, "coverage", "core");
    const componentsDir = path.join(rootDir, "coverage", "components");
    fs.mkdirSync(coreDir, { recursive: true });
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(coreDir, "lcov.info"),
      "SF:core.ts\nend_of_record\n",
    );
    fs.writeFileSync(
      path.join(componentsDir, "lcov.info"),
      "SF:button.tsx\nend_of_record\n",
    );

    const outputPath = mergeLcovReports(rootDir);

    expect(outputPath).toBe(path.join(rootDir, "coverage", "lcov.info"));
    expect(fs.readFileSync(outputPath!, "utf8")).toContain("SF:core.ts");
    expect(fs.readFileSync(outputPath!, "utf8")).toContain("SF:button.tsx");
  });
});
