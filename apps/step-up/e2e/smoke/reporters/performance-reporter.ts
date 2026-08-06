import fs from "node:fs";
import path from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
} from "@playwright/test/reporter";
import { formatPerfTable } from "../performance/analyze";
import { PERF_BASELINE_FILE, PERF_RESULTS_FILE } from "../performance/config";
import type { PerfReport } from "../performance/types";

/**
 * Custom Playwright reporter: prints the slowest pages table and baseline
 * regressions after the smoke performance suite finishes.
 */
export default class PerformanceReporter implements Reporter {
  private resultsFile = PERF_RESULTS_FILE;

  onBegin(config: FullConfig, _suite: Suite) {
    const override = (
      config.metadata as { perfResultsFile?: string } | undefined
    )?.perfResultsFile;
    if (override) this.resultsFile = override;
  }

  onEnd(_result: FullResult) {
    const candidates = [
      this.resultsFile,
      PERF_RESULTS_FILE,
      path.join(process.cwd(), "playwright-results", "performance.json"),
    ];
    const reportPath = candidates.find((p) => fs.existsSync(p));
    if (!reportPath) {
      return;
    }

    let report: PerfReport;
    try {
      report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as PerfReport;
    } catch {
      console.log(`[perf] Could not parse performance report at ${reportPath}`);
      return;
    }

    if (!report.pages?.length) return;

    console.log("\nSmoke performance summary (slowest first)\n");
    console.log(formatPerfTable(report.pages));
    console.log(
      `\nPassed ${report.summary.passed}/${report.summary.total} · Failed ${report.summary.failed}`,
    );

    const regressions = report.pages.flatMap((p) =>
      (p.regression ?? []).map((r) => ({ page: p.path, ...r })),
    );
    if (regressions.length) {
      console.log("\nRegressions vs baseline:");
      for (const r of regressions) {
        console.log(
          `  • ${r.page} ${r.metric}: ${Math.round(r.previousMs)}ms → ${Math.round(r.currentMs)}ms (+${Math.round(r.deltaMs)}ms)`,
        );
      }
    } else if (fs.existsSync(PERF_BASELINE_FILE)) {
      console.log("\nNo regressions vs baseline.");
    } else {
      console.log(
        `\nNo baseline at ${PERF_BASELINE_FILE} — skip regression highlight.`,
      );
    }

    const failed = report.pages.filter((p) => p.status === "FAIL");
    if (failed.length) {
      console.log("\nActionable findings:");
      for (const page of failed) {
        console.log(`  • ${page.path} [${page.primaryCause ?? "unknown"}]`);
        for (const failure of page.failures) {
          console.log(`      - ${failure}`);
        }
        for (const tip of page.recommendations) {
          console.log(`      → ${tip}`);
        }
      }
    }

    console.log(`\nResults written to ${reportPath}\n`);
  }
}
