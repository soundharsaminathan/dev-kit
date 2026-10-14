import { describe, expect, it } from "vitest";
import {
  applyBaselineRegressions,
  buildReport,
  diagnosePrimaryCause,
  evaluatePage,
  formatPerfTable,
  recommendationsFor,
} from "./analyze";
import type { PagePerfResult } from "./types";

function basePage(
  overrides: Partial<PagePerfResult> = {},
): Omit<
  PagePerfResult,
  "status" | "failures" | "primaryCause" | "recommendations" | "regression"
> {
  return {
    name: "Dashboard",
    path: "/app",
    navigationMs: 800,
    domContentLoadedMs: 600,
    loadEventMs: 900,
    fcpMs: 500,
    lcpMs: 1200,
    ttiApproxMs: 1400,
    requestCount: 30,
    failedRequestCount: 0,
    consoleErrorCount: 0,
    consoleErrors: [],
    failedRequestUrls: [],
    resourceSummary: {
      scriptBytes: 200_000,
      scriptCount: 12,
      apiRequestCount: 8,
      longestRequestMs: 200,
      longestRequestUrl: "https://api.example/health",
    },
    ...overrides,
  };
}

describe("smoke performance analyze", () => {
  it("passes pages within budgets", () => {
    const result = evaluatePage(basePage());
    expect(result.status).toBe("PASS");
    expect(result.failures).toEqual([]);
    expect(result.primaryCause).toBeNull();
  });

  it("fails on LCP, navigation, failed requests, and console errors", () => {
    const result = evaluatePage(
      basePage({
        lcpMs: 3000,
        navigationMs: 4000,
        failedRequestCount: 4,
        consoleErrorCount: 1,
        consoleErrors: ["boom"],
      }),
    );
    expect(result.status).toBe("FAIL");
    expect(result.failures.length).toBeGreaterThanOrEqual(4);
    expect(result.primaryCause).toBe("console_errors");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("diagnoses large bundles and excessive API calls", () => {
    expect(
      diagnosePrimaryCause(
        basePage({
          resourceSummary: {
            scriptBytes: 2_000_000,
            scriptCount: 50,
            apiRequestCount: 5,
            longestRequestMs: 100,
            longestRequestUrl: null,
          },
        }),
        ["LCP"],
      ),
    ).toBe("large_bundle");

    expect(
      diagnosePrimaryCause(
        basePage({
          requestCount: 90,
          resourceSummary: {
            scriptBytes: 100_000,
            scriptCount: 5,
            apiRequestCount: 30,
            longestRequestMs: 100,
            longestRequestUrl: null,
          },
        }),
        ["LCP"],
      ),
    ).toBe("excessive_api_calls");
  });

  it("formats a CLI summary table", () => {
    const pass = evaluatePage(
      basePage({ path: "/dashboard", name: "Dashboard" }),
    );
    const fail = evaluatePage(
      basePage({
        name: "Payments",
        path: "/payments",
        navigationMs: 3120,
        lcpMs: 4010,
        requestCount: 96,
      }),
    );
    const table = formatPerfTable([pass, fail]);
    expect(table).toContain("Page");
    expect(table).toContain("Nav ms");
    expect(table).toContain("LCP ms");
    expect(table).toContain("FAIL");
    expect(table).toContain("PASS");
    expect(table).toContain("/payments");
  });

  it("highlights regressions against a baseline", () => {
    const pages = [
      evaluatePage(
        basePage({ navigationMs: 1500, lcpMs: 2000, ttiApproxMs: 2200 }),
      ),
    ];
    const withReg = applyBaselineRegressions(pages, {
      pages: [
        {
          path: "/app",
          navigationMs: 800,
          lcpMs: 1000,
          ttiApproxMs: 1200,
        },
      ],
    });
    expect(withReg[0]?.regression?.length).toBeGreaterThan(0);
  });

  it("builds a report with slowest-first ordering", () => {
    const report = buildReport([
      evaluatePage(basePage({ path: "/a", lcpMs: 1000 })),
      evaluatePage(basePage({ path: "/b", lcpMs: 2000 })),
    ]);
    expect(report.slowestByLoad[0]?.path).toBe("/b");
    expect(report.summary.total).toBe(2);
  });

  it("returns recommendations for each cause", () => {
    const tips = recommendationsFor(basePage(), "blocking_requests");
    expect(tips[0]).toMatch(/Investigate slow request/);
  });
});
