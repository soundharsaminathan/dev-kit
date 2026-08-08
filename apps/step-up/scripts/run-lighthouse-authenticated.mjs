/**
 * Authenticated Lighthouse runs using smoke auth storage state.
 *
 * Requires:
 *   STEP_UP_SMOKE_PASSWORD
 *   STEP_UP_WEB_URL (or --base-url)
 *   Optional: existing e2e/smoke/.auth/{role}.json from smoke auth setup
 *
 * Usage:
 *   node scripts/run-lighthouse-authenticated.mjs [--base-url=http://127.0.0.1:4173] [--runs=3]
 *
 * Soft thresholds only — prints warnings, does not exit non-zero for budgets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { runLighthouseUrl } from "./run-lighthouse.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(dirname, "../e2e/smoke/.auth");

/** Keep in sync with e2e/performance/routes.ts */
const LIGHTHOUSE_ROUTES = [
  { name: "Home", path: "/", public: true },
  { name: "Login", path: "/login", public: true },
  { name: "Student Home", path: "/me", role: "STUDENT" },
  { name: "Student Feed", path: "/me/feed", role: "STUDENT" },
  { name: "Discover Book", path: "/me/book", role: "STUDENT" },
  { name: "Student Calendar", path: "/me/calendar", role: "STUDENT" },
  { name: "Student Messages", path: "/me/messages", role: "STUDENT" },
  { name: "Student Profile", path: "/me/profile", role: "STUDENT" },
  { name: "Student Attendance", path: "/me/attendance", role: "STUDENT" },
  { name: "Dashboard", path: "/app", role: "OWNER" },
  { name: "Batches", path: "/app/batches", role: "OWNER" },
  { name: "Students", path: "/app/students", role: "OWNER" },
  { name: "Bookings", path: "/app/bookings", role: "OWNER" },
  { name: "Payments", path: "/app/payments", role: "OWNER" },
];

const PERF_TARGETS = {
  fcpMs: 1800,
  lcpMs: 2500,
  cls: 0.1,
  tbtMs: 200,
  performanceScore: 0.9,
};

const PERF_SOFT_FAIL = {
  fcpMs: 4500,
  lcpMs: 5500,
  cls: 0.15,
  tbtMs: 1500,
  performanceScore: 0.4,
};

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function authFile(role) {
  return path.join(authDir, `${role.toLowerCase()}.json`);
}

function formatRow(route, median) {
  return {
    route: route.path,
    name: route.name,
    fcpMs: median.fcpMs,
    lcpMs: median.lcpMs,
    tbtMs: median.tbtMs,
    cls: median.cls,
    speedIndexMs: median.speedIndexMs,
    performanceScore: median.performanceScore,
  };
}

function warnBudgets(row) {
  const warnings = [];
  if (row.fcpMs != null && row.fcpMs > PERF_SOFT_FAIL.fcpMs) {
    warnings.push(`FCP ${Math.round(row.fcpMs)}ms > soft ${PERF_SOFT_FAIL.fcpMs}ms`);
  }
  if (row.lcpMs != null && row.lcpMs > PERF_SOFT_FAIL.lcpMs) {
    warnings.push(`LCP ${Math.round(row.lcpMs)}ms > soft ${PERF_SOFT_FAIL.lcpMs}ms`);
  }
  if (row.tbtMs != null && row.tbtMs > PERF_SOFT_FAIL.tbtMs) {
    warnings.push(`TBT ${Math.round(row.tbtMs)}ms > soft ${PERF_SOFT_FAIL.tbtMs}ms`);
  }
  if (row.cls != null && row.cls > PERF_SOFT_FAIL.cls) {
    warnings.push(`CLS ${row.cls.toFixed(3)} > soft ${PERF_SOFT_FAIL.cls}`);
  }
  if (
    row.performanceScore != null &&
    row.performanceScore < PERF_SOFT_FAIL.performanceScore
  ) {
    warnings.push(
      `perf ${Math.round(row.performanceScore * 100)} < soft ${Math.round(PERF_SOFT_FAIL.performanceScore * 100)}`,
    );
  }
  return warnings;
}

const baseUrl = (
  arg("base-url", process.env.STEP_UP_WEB_URL ?? "http://127.0.0.1:4173")
).replace(/\/$/, "");
const runs = Math.max(1, Number(arg("runs", "3")));
const outRoot = arg("out-dir", "lighthouse-results/authenticated");

const publicRoutes = LIGHTHOUSE_ROUTES.filter((r) => r.public);
const authedRoutes = LIGHTHOUSE_ROUTES.filter((r) => !r.public);

const table = [];

console.log("\n=== Public routes ===\n");
for (const route of publicRoutes) {
  const url = `${baseUrl}${route.path}`;
  const outDir = path.join(outRoot, route.name.replace(/\s+/g, "-").toLowerCase());
  console.log(`\n${route.name}  ${url}`);
  const summary = await runLighthouseUrl(url, runs, outDir);
  table.push(formatRow(route, summary.median));
}

const rolesNeeded = [...new Set(authedRoutes.map((r) => r.role).filter(Boolean))];
const missingAuth = rolesNeeded.filter((role) => !fs.existsSync(authFile(role)));

if (missingAuth.length) {
  console.log(
    `\n[auth] Missing smoke storage for: ${missingAuth.join(", ")}.`,
  );
  console.log(
    "[auth] Run smoke auth setup against a deployed/preview host with STEP_UP_SMOKE_PASSWORD first.",
  );
  console.log(
    "[auth] Skipping authenticated Lighthouse routes for this run.\n",
  );
} else {
  console.log("\n=== Authenticated routes (smoke storage state) ===\n");

  for (const route of authedRoutes) {
    const role = route.role;
    if (!role) continue;
    const statePath = authFile(role);
    const origin = new URL(baseUrl).origin;

    // Serve authed pages through a Playwright browser context that already has
    // Firebase/session cookies, then point Lighthouse at the same origin after
    // a warm navigation that leaves storage intact via chrome user-data is hard.
    // Practical approach: open the route with Playwright to confirm auth works,
    // then run Lighthouse with an extra header cookie dump when available.
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH || undefined,
    });
    try {
      const context = await browser.newContext({
        storageState: statePath,
        baseURL: baseUrl,
      });
      const page = await context.newPage();
      const response = await page.goto(route.path, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const finalUrl = page.url();
      const ok =
        response?.ok() &&
        !finalUrl.includes("/login") &&
        finalUrl.includes(route.path.split("?")[0]);
      console.log(
        `${route.name}: auth probe ${ok ? "ok" : "FAILED"} → ${finalUrl}`,
      );
      await context.close();

      if (!ok) {
        table.push({
          route: route.path,
          name: route.name,
          error: `auth probe failed (${finalUrl})`,
        });
        continue;
      }
    } finally {
      await browser.close();
    }

    // Lighthouse itself cannot easily reuse Playwright storageState against a
    // SPA Firebase session. Record the probe and run Lighthouse against the
    // URL for network/CPU cost of the shell; treat auth correctness separately.
    const url = `${baseUrl}${route.path}`;
    const outDir = path.join(
      outRoot,
      route.name.replace(/\s+/g, "-").toLowerCase(),
    );
    console.log(`\n${route.name}  ${url}  (role=${role})`);
    console.log(
      "Note: Lighthouse cold load may redirect to /login without Firebase IDB; prefer Playwright smoke perf for authed TTI.",
    );
    const summary = await runLighthouseUrl(url, runs, outDir);
    table.push({
      ...formatRow(route, summary.median),
      role,
      authNote:
        "Cold Lighthouse may be unauthenticated; use Playwright smoke @perf for session metrics.",
    });
  }
}

fs.mkdirSync(outRoot, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  targets: PERF_TARGETS,
  softFail: PERF_SOFT_FAIL,
  rows: table,
};
fs.writeFileSync(
  path.join(outRoot, "table.json"),
  JSON.stringify(report, null, 2),
);

console.log("\n=== Summary table ===\n");
console.log(
  [
    "Route".padEnd(22),
    "FCP".padStart(7),
    "LCP".padStart(7),
    "TBT".padStart(7),
    "CLS".padStart(7),
    "SI".padStart(7),
    "Perf".padStart(6),
  ].join(" "),
);
for (const row of table) {
  if (row.error) {
    console.log(`${row.route.padEnd(22)} ERROR ${row.error}`);
    continue;
  }
  console.log(
    [
      row.route.padEnd(22),
      row.fcpMs == null ? "—".padStart(7) : `${(row.fcpMs / 1000).toFixed(2)}s`.padStart(7),
      row.lcpMs == null ? "—".padStart(7) : `${(row.lcpMs / 1000).toFixed(2)}s`.padStart(7),
      row.tbtMs == null ? "—".padStart(7) : `${Math.round(row.tbtMs)}ms`.padStart(7),
      row.cls == null ? "—".padStart(7) : row.cls.toFixed(3).padStart(7),
      row.speedIndexMs == null
        ? "—".padStart(7)
        : `${(row.speedIndexMs / 1000).toFixed(2)}s`.padStart(7),
      row.performanceScore == null
        ? "—".padStart(6)
        : String(Math.round(row.performanceScore * 100)).padStart(6),
    ].join(" "),
  );
  for (const w of warnBudgets(row)) {
    console.log(`  ! soft: ${w}`);
  }
}

console.log(`\nWrote ${path.join(outRoot, "table.json")}`);
