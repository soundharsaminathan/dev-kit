import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatCoverageComment,
  readLibCoverageSummaries,
  writeCoverageComment,
} from "../format-coverage-comment.ts";

const metrics = (total: number, covered: number, pct: number) => ({
  total,
  covered,
  skipped: 0,
  pct,
});

describe("formatCoverageComment", () => {
  it("renders total coverage metrics as markdown", () => {
    const comment = formatCoverageComment({
      total: {
        lines: metrics(100, 95, 95),
        statements: metrics(120, 114, 95),
        functions: metrics(40, 38, 95),
        branches: metrics(80, 68, 85),
      },
    });

    expect(comment).toContain("## dev-kit coverage");
    expect(comment).toContain("| Statements | 114/120 | 95.00% |");
    expect(comment).toContain("| Branches | 68/80 | 85.00% |");
    expect(comment).toContain("| Functions | 38/40 | 95.00% |");
    expect(comment).toContain("| Lines | 95/100 | 95.00% |");
  });

  it("renders per-library coverage sections", () => {
    const comment = formatCoverageComment(
      {
        total: {
          lines: metrics(100, 95, 95),
          statements: metrics(120, 114, 95),
          functions: metrics(40, 38, 95),
          branches: metrics(80, 68, 85),
        },
      },
      [
        {
          project: "components",
          total: {
            lines: metrics(50, 46, 92),
            statements: metrics(60, 55, 91.67),
            functions: metrics(20, 19, 95),
            branches: metrics(30, 24, 80),
          },
        },
      ],
    );

    expect(comment).toContain("## Libraries");
    expect(comment).toContain("### components");
    expect(comment).toContain("| Lines | 46/50 | 92.00% |");
  });

  it("throws when the summary is missing total metrics", () => {
    expect(() => formatCoverageComment({} as never)).toThrow(
      "coverage-summary.json is missing a total entry",
    );
  });
});

describe("readLibCoverageSummaries", () => {
  it("reads per-library coverage summaries when present", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lib-coverage-"));
    const componentsDir = path.join(tempDir, "coverage", "components");
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(componentsDir, "coverage-summary.json"),
      JSON.stringify({
        total: {
          lines: metrics(10, 9, 90),
          statements: metrics(10, 9, 90),
          functions: metrics(4, 4, 100),
          branches: metrics(6, 5, 83.33),
        },
      }),
    );

    const summaries = readLibCoverageSummaries(tempDir);

    expect(summaries).toEqual([
      expect.objectContaining({
        project: "components",
        total: expect.objectContaining({
          lines: expect.objectContaining({ pct: 90 }),
        }),
      }),
    ]);
  });
});

describe("writeCoverageComment", () => {
  it("writes markdown from a coverage summary file", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "coverage-comment-"));
    const summaryPath = path.join(tempDir, "coverage-summary.json");
    const outputPath = path.join(tempDir, "coverage-comment.md");

    fs.writeFileSync(
      summaryPath,
      JSON.stringify({
        total: {
          lines: metrics(10, 8, 80),
          statements: metrics(10, 8, 80),
          functions: metrics(4, 3, 75),
          branches: metrics(6, 4, 66.67),
        },
      }),
    );

    const comment = writeCoverageComment(summaryPath, outputPath);

    expect(comment).toContain("## dev-kit coverage");
    expect(fs.readFileSync(outputPath, "utf8")).toBe(comment);
  });
});
