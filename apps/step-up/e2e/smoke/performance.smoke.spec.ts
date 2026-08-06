import fs from "node:fs";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { authFile, expect, type SmokeRole, test } from "./fixtures";
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

async function openAuthedPage(
  browser: Browser,
  role: SmokeRole,
): Promise<{ context: BrowserContext; page: Page }> {
  const statePath = authFile(role);
  if (!fs.existsSync(statePath)) {
    throw new Error(`${role} auth state missing — smoke-setup must run first`);
  }
  const context = await browser.newContext({
    storageState: statePath,
    viewport: PERF_VIEWPORT,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await preparePerfPage(page);
  return { context, page };
}

test.describe("smoke performance @smoke @perf", () => {
  test("critical routes meet smoke performance budgets @smoke @perf", async ({
    browser,
  }) => {
    // ~32 routes; keep sequential and under a few minutes for CI smoke.
    test.setTimeout(180_000);

    const results: PagePerfResult[] = [];
    const guestContext = await browser.newContext({
      viewport: PERF_VIEWPORT,
      reducedMotion: "reduce",
    });
    const guestPage = await guestContext.newPage();
    await preparePerfPage(guestPage);

    const owner = await openAuthedPage(browser, "OWNER");
    const student = await openAuthedPage(browser, "STUDENT");

    const pageFor = (role?: SmokeRole): Page => {
      if (role === "OWNER") return owner.page;
      if (role === "STUDENT") return student.page;
      return guestPage;
    };

    try {
      for (const route of CRITICAL_ROUTES) {
        const measured = await measureRoute(pageFor(route.role), route);
        results.push(measured);
      }
    } finally {
      await guestContext.close();
      await owner.context.close();
      await student.context.close();
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
