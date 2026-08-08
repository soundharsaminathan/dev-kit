/**
 * Authenticated Lighthouse runs using Firebase-seeded Chrome profiles.
 *
 * Requires:
 *   STEP_UP_SMOKE_PASSWORD (for setup if chrome profiles missing)
 *   STEP_UP_WEB_URL (or --base-url)
 *
 * Usage:
 *   node scripts/run-lighthouse-authenticated.mjs \
 *     [--base-url=http://127.0.0.1:4173] [--runs=3] [--device=mobile|desktop|both]
 *     [--only-authed] [--only-public]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runLighthouseUrl } from "./run-lighthouse.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(dirname, "../e2e/smoke/.auth");
const profilesDir = path.join(authDir, "chrome-profiles");

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

function profileDir(role) {
  return path.join(profilesDir, role.toLowerCase());
}

function formatRow(route, median, device) {
  return {
    route: route.path,
    name: route.name,
    device,
    role: route.role ?? null,
    public: Boolean(route.public),
    fcpMs: median.fcpMs,
    lcpMs: median.lcpMs,
    tbtMs: median.tbtMs,
    cls: median.cls,
    speedIndexMs: median.speedIndexMs,
    performanceScore: median.performanceScore,
  };
}

function warnBudgets(row, soft = PERF_SOFT_FAIL) {
  const warnings = [];
  if (row.fcpMs != null && row.fcpMs > soft.fcpMs) {
    warnings.push(`FCP ${Math.round(row.fcpMs)}ms > soft ${soft.fcpMs}ms`);
  }
  if (row.lcpMs != null && row.lcpMs > soft.lcpMs) {
    warnings.push(`LCP ${Math.round(row.lcpMs)}ms > soft ${soft.lcpMs}ms`);
  }
  if (row.tbtMs != null && row.tbtMs > soft.tbtMs) {
    warnings.push(`TBT ${Math.round(row.tbtMs)}ms > soft ${soft.tbtMs}ms`);
  }
  if (row.cls != null && row.cls > soft.cls) {
    warnings.push(`CLS ${row.cls.toFixed(3)} > soft ${soft.cls}`);
  }
  if (
    row.performanceScore != null &&
    row.performanceScore < soft.performanceScore
  ) {
    warnings.push(
      `perf ${Math.round(row.performanceScore * 100)} < soft ${Math.round(soft.performanceScore * 100)}`,
    );
  }
  return warnings;
}

function ensureAuthProfiles(baseUrl) {
  const rolesNeeded = ["STUDENT", "OWNER"];
  const missing = rolesNeeded.filter((role) => !fs.existsSync(profileDir(role)));
  if (!missing.length) return true;

  if (!process.env.STEP_UP_SMOKE_PASSWORD) {
    console.log(`\n[auth] Missing Chrome profiles for: ${missing.join(", ")}.`);
    console.log(
      "[auth] Set STEP_UP_SMOKE_PASSWORD and re-run, or run scripts/setup-lighthouse-auth.mjs first.",
    );
    return false;
  }

  console.log(`\n[auth] Creating Chrome profiles for ${missing.join(", ")}…`);
  const result = spawnSync(
    process.execPath,
    [
      path.join(dirname, "setup-lighthouse-auth.mjs"),
      `--base-url=${baseUrl}`,
    ],
    {
      stdio: "inherit",
      env: process.env,
    },
  );
  if (result.status !== 0) {
    console.error("[auth] setup-lighthouse-auth.mjs failed");
    return false;
  }
  return rolesNeeded.every((role) => fs.existsSync(profileDir(role)));
}

function printTable(table) {
  console.log("\n=== Summary table ===\n");
  console.log(
    [
      "Route".padEnd(22),
      "Dev".padEnd(8),
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
      console.log(
        `${row.route.padEnd(22)} ${(row.device ?? "").padEnd(8)} ERROR ${row.error}`,
      );
      continue;
    }
    console.log(
      [
        row.route.padEnd(22),
        (row.device ?? "").padEnd(8),
        row.fcpMs == null
          ? "—".padStart(7)
          : `${(row.fcpMs / 1000).toFixed(2)}s`.padStart(7),
        row.lcpMs == null
          ? "—".padStart(7)
          : `${(row.lcpMs / 1000).toFixed(2)}s`.padStart(7),
        row.tbtMs == null
          ? "—".padStart(7)
          : `${Math.round(row.tbtMs)}ms`.padStart(7),
        row.cls == null ? "—".padStart(7) : row.cls.toFixed(3).padStart(7),
        row.speedIndexMs == null
          ? "—".padStart(7)
          : `${(row.speedIndexMs / 1000).toFixed(2)}s`.padStart(7),
        row.performanceScore == null
          ? "—".padStart(6)
          : String(Math.round(row.performanceScore * 100)).padStart(6),
      ].join(" "),
    );
    const soft = row.public ? PERF_TARGETS : PERF_SOFT_FAIL;
    for (const w of warnBudgets(row, soft)) {
      console.log(`  ! ${row.public ? "target" : "soft"}: ${w}`);
    }
  }
}

const baseUrl = (
  arg("base-url", process.env.STEP_UP_WEB_URL ?? "http://127.0.0.1:4173")
).replace(/\/$/, "");
const runs = Math.max(1, Number(arg("runs", "3")));
const deviceArg = arg("device", "mobile");
const devices =
  deviceArg === "both"
    ? ["mobile", "desktop"]
    : deviceArg === "desktop"
      ? ["desktop"]
      : ["mobile"];
const outRoot = arg("out-dir", "lighthouse-results/authenticated");
const onlyAuthed = process.argv.includes("--only-authed");
const onlyPublic = process.argv.includes("--only-public");

const publicRoutes = onlyAuthed
  ? []
  : LIGHTHOUSE_ROUTES.filter((r) => r.public);
const authedRoutes = onlyPublic
  ? []
  : LIGHTHOUSE_ROUTES.filter((r) => !r.public);

const table = [];

for (const device of devices) {
  if (publicRoutes.length) {
    console.log(`\n=== Public routes (${device}) ===\n`);
    for (const route of publicRoutes) {
      const url = `${baseUrl}${route.path}`;
      const outDir = path.join(
        outRoot,
        device,
        route.name.replace(/\s+/g, "-").toLowerCase(),
      );
      console.log(`\n${route.name}  ${url}`);
      const summary = await runLighthouseUrl(url, runs, outDir, {
        formFactor: device,
      });
      table.push(formatRow(route, summary.median, device));
    }
  }

  if (authedRoutes.length) {
    const ok = ensureAuthProfiles(baseUrl);
    if (!ok) {
      console.log("\n[auth] Skipping authenticated Lighthouse routes.\n");
    } else {
      console.log(
        `\n=== Authenticated routes (${device}, Firebase Chrome profiles) ===\n`,
      );
      for (const route of authedRoutes) {
        const role = route.role;
        if (!role) continue;
        const authProfile = profileDir(role);
        const url = `${baseUrl}${route.path}`;
        const outDir = path.join(
          outRoot,
          device,
          route.name.replace(/\s+/g, "-").toLowerCase(),
        );
        console.log(`\n${route.name}  ${url}  (role=${role})`);
        const summary = await runLighthouseUrl(url, runs, outDir, {
          formFactor: device,
          authProfileDir: authProfile,
          expectedPathPrefix: route.path,
        });
        const authFailed = summary.runsDetail?.some((r) => r.authFailed);
        if (authFailed) {
          table.push({
            route: route.path,
            name: route.name,
            device,
            role,
            error: "auth redirect (profile missing Firebase session)",
          });
          continue;
        }
        table.push(formatRow(route, summary.median, device));
      }
    }
  }
}

fs.mkdirSync(outRoot, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  devices,
  targets: PERF_TARGETS,
  softFail: PERF_SOFT_FAIL,
  rows: table,
};
fs.writeFileSync(
  path.join(outRoot, "table.json"),
  JSON.stringify(report, null, 2),
);

printTable(table);
console.log(`\nWrote ${path.join(outRoot, "table.json")}`);
