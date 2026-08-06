import { perfThresholds } from "./config";
import type {
  PagePerfResult,
  PerfBaseline,
  PerfPrimaryCause,
  PerfReport,
  PerfStatus,
} from "./types";

export function evaluatePage(
  partial: Omit<
    PagePerfResult,
    "status" | "failures" | "primaryCause" | "recommendations" | "regression"
  >,
): PagePerfResult {
  const thresholds = perfThresholds();
  const failures: string[] = [];

  if (partial.lcpMs != null && partial.lcpMs > thresholds.lcpMs) {
    failures.push(
      `LCP ${Math.round(partial.lcpMs)}ms exceeds ${thresholds.lcpMs}ms`,
    );
  }
  if (partial.navigationMs > thresholds.navigationMs) {
    failures.push(
      `Navigation ${Math.round(partial.navigationMs)}ms exceeds ${thresholds.navigationMs}ms`,
    );
  }
  if (partial.failedRequestCount > thresholds.maxFailedRequests) {
    failures.push(
      `${partial.failedRequestCount} failed requests (max ${thresholds.maxFailedRequests})`,
    );
  }
  if (partial.consoleErrorCount > 0) {
    failures.push(`${partial.consoleErrorCount} uncaught JavaScript error(s)`);
  }

  const status: PerfStatus = failures.length > 0 ? "FAIL" : "PASS";
  const primaryCause =
    status === "FAIL" ? diagnosePrimaryCause(partial, failures) : null;
  const recommendations =
    status === "FAIL"
      ? recommendationsFor(partial, primaryCause)
      : ([] as string[]);

  return {
    ...partial,
    status,
    failures,
    primaryCause,
    recommendations,
  };
}

export function diagnosePrimaryCause(
  page: Pick<
    PagePerfResult,
    | "consoleErrorCount"
    | "failedRequestCount"
    | "navigationMs"
    | "lcpMs"
    | "ttiApproxMs"
    | "domContentLoadedMs"
    | "resourceSummary"
    | "requestCount"
  >,
  failures: string[],
): PerfPrimaryCause {
  if (page.consoleErrorCount > 0) return "console_errors";
  if (failures.some((f) => f.includes("failed requests"))) {
    return "failed_requests";
  }

  const { resourceSummary } = page;
  const scriptMb = resourceSummary.scriptBytes / (1024 * 1024);
  if (scriptMb >= 1.5 || resourceSummary.scriptCount >= 40) {
    return "large_bundle";
  }
  if (resourceSummary.apiRequestCount >= 25 || page.requestCount >= 80) {
    return "excessive_api_calls";
  }
  if (
    resourceSummary.longestRequestMs >= 1500 &&
    resourceSummary.longestRequestUrl
  ) {
    return "blocking_requests";
  }

  const paintGap =
    page.lcpMs != null && page.domContentLoadedMs != null
      ? page.lcpMs - page.domContentLoadedMs
      : 0;
  if (paintGap >= 800 || page.ttiApproxMs - page.navigationMs >= 1000) {
    return "render_delay";
  }
  if (failures.some((f) => f.includes("Navigation"))) {
    return "slow_navigation";
  }
  return "unknown";
}

export function recommendationsFor(
  page: Pick<
    PagePerfResult,
    "resourceSummary" | "failedRequestUrls" | "consoleErrors" | "path"
  >,
  cause: PerfPrimaryCause | null,
): string[] {
  switch (cause) {
    case "large_bundle":
      return [
        `Reduce JS payload on ${page.path} (observed ~${(page.resourceSummary.scriptBytes / 1024).toFixed(0)}KB across ${page.resourceSummary.scriptCount} scripts).`,
        "Code-split heavy route modules and defer non-critical third-party scripts.",
      ];
    case "excessive_api_calls":
      return [
        `Consolidate API traffic on ${page.path} (${page.resourceSummary.apiRequestCount} API requests observed).`,
        "Batch related queries, cache with React Query, and avoid duplicate fetches on mount.",
      ];
    case "blocking_requests":
      return [
        `Investigate slow request: ${page.resourceSummary.longestRequestUrl ?? "unknown"} (${Math.round(page.resourceSummary.longestRequestMs)}ms).`,
        "Move blocking work off the critical path; prefer streaming or deferred loads for non-hero data.",
      ];
    case "render_delay":
      return [
        `Main content painted late after DOM ready on ${page.path} — look for client-only gates, large images, or layout thrash.`,
        "Ensure LCP element is server/edge-friendly and avoid delaying above-the-fold data on client waterfalls.",
      ];
    case "console_errors":
      return [
        `Fix uncaught JS errors before tuning load time: ${page.consoleErrors.slice(0, 2).join(" | ") || "see report"}.`,
      ];
    case "failed_requests":
      return [
        `Repair failing network calls: ${page.failedRequestUrls.slice(0, 3).join(", ") || "see report"}.`,
        "Failed assets/API calls inflate retries and block interactivity.",
      ];
    case "slow_navigation":
      return [
        `Document/TTFB or redirect chain is slow for ${page.path}. Check CDN cache, auth redirects, and edge latency.`,
      ];
    default:
      return [
        `Review the metrics for ${page.path} and compare against the previous baseline.`,
      ];
  }
}

export function applyBaselineRegressions(
  pages: PagePerfResult[],
  baseline: PerfBaseline | null,
): PagePerfResult[] {
  if (!baseline?.pages?.length) return pages;
  const thresholds = perfThresholds();
  const byPath = new Map(baseline.pages.map((p) => [p.path, p]));

  return pages.map((page) => {
    const prev = byPath.get(page.path);
    if (!prev) return page;

    const regression: NonNullable<PagePerfResult["regression"]> = [];
    const checks: {
      metric: string;
      previousMs: number;
      currentMs: number | null;
    }[] = [
      {
        metric: "navigation",
        previousMs: prev.navigationMs,
        currentMs: page.navigationMs,
      },
      {
        metric: "lcp",
        previousMs: prev.lcpMs ?? 0,
        currentMs: page.lcpMs,
      },
      {
        metric: "tti",
        previousMs: prev.ttiApproxMs,
        currentMs: page.ttiApproxMs,
      },
    ];

    for (const check of checks) {
      if (check.currentMs == null || check.previousMs <= 0) continue;
      const deltaMs = check.currentMs - check.previousMs;
      if (deltaMs >= thresholds.regressionDeltaMs) {
        regression.push({
          metric: check.metric,
          previousMs: check.previousMs,
          currentMs: check.currentMs,
          deltaMs,
        });
      }
    }

    return regression.length ? { ...page, regression } : page;
  });
}

export function buildReport(pages: PagePerfResult[]): PerfReport {
  const thresholds = perfThresholds();
  const slowestByLoad = [...pages]
    .map((p) => ({
      path: displayPath(p),
      loadMs: p.lcpMs ?? p.loadEventMs ?? p.navigationMs,
      status: p.status,
    }))
    .sort((a, b) => b.loadMs - a.loadMs);

  return {
    generatedAt: new Date().toISOString(),
    thresholds: {
      lcpMs: thresholds.lcpMs,
      navigationMs: thresholds.navigationMs,
      maxFailedRequests: thresholds.maxFailedRequests,
    },
    pages,
    slowestByLoad,
    summary: {
      total: pages.length,
      passed: pages.filter((p) => p.status === "PASS").length,
      failed: pages.filter((p) => p.status === "FAIL").length,
    },
  };
}

export function displayPath(page: Pick<PagePerfResult, "name" | "path">) {
  return page.path;
}

export function formatPerfTable(pages: PagePerfResult[]): string {
  const rows = [...pages].sort((a, b) => {
    const aLoad = a.lcpMs ?? a.navigationMs;
    const bLoad = b.lcpMs ?? b.navigationMs;
    return bLoad - aLoad;
  });

  const colPage = Math.max(20, ...rows.map((r) => displayPath(r).length));
  const header = [
    pad("Page", colPage),
    pad("Nav ms", 8, true),
    pad("LCP ms", 8, true),
    pad("Requests", 9, true),
    pad("Status", 8, true),
  ];
  const sep = [
    "─".repeat(colPage),
    "─".repeat(8),
    "─".repeat(8),
    "─".repeat(9),
    "─".repeat(8),
  ];

  const lines = [
    `┌─${sep[0]}─┬─${sep[1]}─┬─${sep[2]}─┬─${sep[3]}─┬─${sep[4]}─┐`,
    `│ ${header[0]} │ ${header[1]} │ ${header[2]} │ ${header[3]} │ ${header[4]} │`,
    `├─${sep[0]}─┼─${sep[1]}─┼─${sep[2]}─┼─${sep[3]}─┼─${sep[4]}─┤`,
  ];

  for (const row of rows) {
    lines.push(
      `│ ${pad(displayPath(row), colPage)} │ ${pad(String(Math.round(row.navigationMs)), 8, true)} │ ${pad(row.lcpMs == null ? "—" : String(Math.round(row.lcpMs)), 8, true)} │ ${pad(String(row.requestCount), 9, true)} │ ${pad(row.status, 8, true)} │`,
    );
  }

  lines.push(`└─${sep[0]}─┴─${sep[1]}─┴─${sep[2]}─┴─${sep[3]}─┴─${sep[4]}─┘`);
  return lines.join("\n");
}

function pad(value: string, width: number, right = false) {
  if (value.length >= width) return value.slice(0, width);
  const space = " ".repeat(width - value.length);
  return right ? space + value : value + space;
}
