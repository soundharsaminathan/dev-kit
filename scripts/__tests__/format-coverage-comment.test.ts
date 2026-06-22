import { describe, expect, it } from "vitest";
import { formatCoverageComment } from "../format-coverage-comment.ts";

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
    expect(comment).toContain("app.codecov.io/gh/soundharsaminathan/dev-kit");
  });
});
