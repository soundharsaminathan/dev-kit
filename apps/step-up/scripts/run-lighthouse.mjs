/**
 * Run Lighthouse (mobile) against a URL using Playwright's Chromium binary.
 * Ignores chrome-launcher temp-dir EPERM failures on Windows after the run.
 *
 * Usage:
 *   node scripts/run-lighthouse.mjs <url> [runs=3] [outDir]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import lighthouse from "lighthouse";

const require = createRequire(import.meta.url);
const lighthousePkg = require.resolve("lighthouse/package.json");
const requireLh = createRequire(lighthousePkg);
const chromeLauncher = requireLh("chrome-launcher");

function findPlaywrightChrome() {
  const base = path.join(
    process.env.USERPROFILE ?? process.env.HOME ?? "",
    "AppData/Local/ms-playwright",
  );
  if (!fs.existsSync(base)) return undefined;
  const match = fs
    .readdirSync(base)
    .filter((d) => d.startsWith("chromium-"))
    .sort()
    .reverse()[0];
  if (!match) return undefined;
  const exe = path.join(base, match, "chrome-win", "chrome.exe");
  return fs.existsSync(exe) ? exe : undefined;
}

function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function extract(report) {
  const audits = report.audits ?? {};
  const lcpEl = audits["largest-contentful-paint-element"];
  return {
    performanceScore: report.categories?.performance?.score ?? null,
    fcpMs: audits["first-contentful-paint"]?.numericValue ?? null,
    lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
    tbtMs: audits["total-blocking-time"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    speedIndexMs: audits["speed-index"]?.numericValue ?? null,
    ttiMs: audits.interactive?.numericValue ?? null,
    lcpElement:
      lcpEl?.details?.items?.[0]?.node?.snippet ??
      lcpEl?.displayValue ??
      null,
    runtimeError: report.runtimeError ?? null,
  };
}

const url = process.argv[2] ?? "http://127.0.0.1:4173/";
const runs = Math.max(1, Number(process.argv[3] ?? 3));
const outDir = process.argv[4] ?? "lighthouse-baseline";
fs.mkdirSync(outDir, { recursive: true });

const chromePath = findPlaywrightChrome();
const results = [];

for (let i = 1; i <= runs; i++) {
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });

  try {
    const report = await lighthouse(
      url,
      {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance"],
      },
      {
        extends: "lighthouse:default",
        settings: {
          formFactor: "mobile",
          throttlingMethod: "simulate",
          screenEmulation: {
            mobile: true,
            width: 412,
            height: 823,
            deviceScaleFactor: 1.75,
            disabled: false,
          },
        },
      },
    );

    if (!report?.lhr) {
      throw new Error(`Lighthouse returned empty report for run ${i}`);
    }

    const metrics = extract(report.lhr);
    results.push(metrics);

    const slug = url.replace(/https?:\/\//, "").replace(/[^\w]+/g, "_");
    fs.writeFileSync(
      path.join(outDir, `${slug}-run${i}.json`),
      JSON.stringify(report.lhr, null, 2),
    );

    console.log(
      [
        `run ${i}/${runs}`,
        `perf=${metrics.performanceScore == null ? "—" : Math.round(metrics.performanceScore * 100)}`,
        `FCP=${metrics.fcpMs == null ? "—" : (metrics.fcpMs / 1000).toFixed(2)}s`,
        `LCP=${metrics.lcpMs == null ? "—" : (metrics.lcpMs / 1000).toFixed(2)}s`,
        `TBT=${metrics.tbtMs == null ? "—" : Math.round(metrics.tbtMs)}ms`,
        `CLS=${metrics.cls == null ? "—" : metrics.cls.toFixed(3)}`,
        `SI=${metrics.speedIndexMs == null ? "—" : (metrics.speedIndexMs / 1000).toFixed(2)}s`,
        metrics.runtimeError ? `ERR=${metrics.runtimeError.code}` : "",
      ]
        .filter(Boolean)
        .join("  "),
    );
    if (metrics.lcpElement) {
      console.log(`  LCP: ${String(metrics.lcpElement).slice(0, 140)}`);
    }
  } finally {
    try {
      // Avoid chrome-launcher destroyTmp EPERM on Windows — just signal the process.
      if (chrome.pid) {
        try {
          process.kill(chrome.pid);
        } catch {
          // already exited
        }
      }
    } catch {
      // ignore
    }
  }
}

const summary = {
  url,
  runs,
  generatedAt: new Date().toISOString(),
  median: {
    performanceScore: median(results.map((r) => r.performanceScore)),
    fcpMs: median(results.map((r) => r.fcpMs)),
    lcpMs: median(results.map((r) => r.lcpMs)),
    tbtMs: median(results.map((r) => r.tbtMs)),
    cls: median(results.map((r) => r.cls)),
    speedIndexMs: median(results.map((r) => r.speedIndexMs)),
    ttiMs: median(results.map((r) => r.ttiMs)),
  },
  runsDetail: results,
};

fs.writeFileSync(
  path.join(outDir, "summary.json"),
  JSON.stringify(summary, null, 2),
);

const m = summary.median;
console.log("\nMedian:");
console.log(
  [
    `perf=${m.performanceScore == null ? "—" : Math.round(m.performanceScore * 100)}`,
    `FCP=${m.fcpMs == null ? "—" : (m.fcpMs / 1000).toFixed(2)}s`,
    `LCP=${m.lcpMs == null ? "—" : (m.lcpMs / 1000).toFixed(2)}s`,
    `TBT=${m.tbtMs == null ? "—" : Math.round(m.tbtMs)}ms`,
    `CLS=${m.cls == null ? "—" : m.cls.toFixed(3)}`,
    `SI=${m.speedIndexMs == null ? "—" : (m.speedIndexMs / 1000).toFixed(2)}s`,
  ].join("  "),
);

