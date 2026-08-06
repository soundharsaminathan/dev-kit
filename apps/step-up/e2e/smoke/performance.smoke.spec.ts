import fs from "node:fs";
import path from "node:path";
import { authFile, expect, test } from "./fixtures";
import {
  applyBaselineRegressions,
  buildReport,
  formatPerfTable,
} from "./performance/analyze";
import { measureRoute, preparePerfPage } from "./performance/collect";
import {
  CRITICAL_ROUTES,
  PERF_BASELINE_FILE,
  PERF_RESULTS_DIR,
  PERF_RESULTS_FILE,
  PERF_VIEWPORT,
} from "./performance/config";
import type { PagePerfResult, PerfBaseline } from "./performance/types";

function loadBaseline(): PerfBaseline | null {
  // Prefer committed baseline; fall back to previous CI artifact if present.
  const candidates = [
    PERF_BASELINE_FILE,
    path.join(PERF_RESULTS_DIR, "performance-baseline.json"),
    path.join(PERF_RESULTS_DIR, "performance.prev.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as PerfBaseline;
    } catch {
      // ignore corrupt baseline
    }
  }
  return null;
}

function writeReport(pages: PagePerfResult[]) {
  fs.mkdirSync(PERF_RESULTS_DIR, { recursive: true });
  const report = buildReport(pages);
  fs.writeFileSync(PERF_RESULTS_FILE, JSON.stringify(report, null, 2));
  return report;
}

test.describe("smoke performance @smoke @perf", () => {
  test("critical routes meet smoke performance budgets @smoke @perf", async ({
    browser,
  }) => {
    // Keep well under the 2-minute suite budget for 10 routes.
    test.setTimeout(120_000);

    const results: PagePerfResult[] = [];
    const guestContext = await browser.newContext({
      viewport: PERF_VIEWPORT,
      reducedMotion: "reduce",
    });
    const ownerState = authFile("OWNER");
    if (!fs.existsSync(ownerState)) {
      throw new Error("OWNER auth state missing — smoke-setup must run first");
    }
    const ownerContext = await browser.newContext({
      storageState: ownerState,
      viewport: PERF_VIEWPORT,
      reducedMotion: "reduce",
    });

    const guestPage = await guestContext.newPage();
    const ownerPage = await ownerContext.newPage();
    await preparePerfPage(guestPage);
    await preparePerfPage(ownerPage);

    try {
      for (const route of CRITICAL_ROUTES) {
        const page = route.role ? ownerPage : guestPage;
        const measured = await measureRoute(page, route);
        results.push(measured);
      }
    } finally {
      await guestContext.close();
      await ownerContext.close();
    }

    const withRegressions = applyBaselineRegressions(results, loadBaseline());
    const report = writeReport(withRegressions);

    // Always print the table from the test as well (reporter also prints onEnd).
    console.log(`\n${formatPerfTable(report.pages)}\n`);

    const failed = report.pages.filter((p) => p.status === "FAIL");
    expect(
      failed,
      failed
        .map(
          (p) =>
            `${p.path}: ${p.failures.join("; ")} [${p.primaryCause ?? "unknown"}]`,
        )
        .join("\n") || "performance budgets exceeded",
    ).toEqual([]);
  });
});
