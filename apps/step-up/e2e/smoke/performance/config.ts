import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SmokeRole } from "../smoke-seed";
import { SMOKE } from "../smoke-seed";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute paths for CI artifacts and optional committed baseline. */
export const PERF_RESULTS_DIR = path.join(
  dirname,
  "../../../playwright-results",
);
export const PERF_RESULTS_FILE = path.join(
  PERF_RESULTS_DIR,
  "performance.json",
);
export const PERF_BASELINE_FILE = path.join(
  dirname,
  "performance-baseline.json",
);

export const PERF_VIEWPORT = { width: 1280, height: 720 } as const;

export function perfThresholds() {
  return {
    lcpMs: Number(process.env.STEP_UP_PERF_LCP_MS ?? 2500),
    navigationMs: Number(process.env.STEP_UP_PERF_NAV_MS ?? 3000),
    maxFailedRequests: Number(process.env.STEP_UP_PERF_MAX_FAILED ?? 3),
    /** Regression highlight threshold (ms delta vs baseline). */
    regressionDeltaMs: Number(process.env.STEP_UP_PERF_REGRESSION_MS ?? 500),
  };
}

export type CriticalRoute = {
  name: string;
  /** Path used for navigation (and reported in the summary table). */
  path: string;
  /** Auth role; omit for guest/public pages. */
  role?: SmokeRole;
  /**
   * Optional post-navigation interaction measured as part of "usable"
   * (e.g. open notifications panel — there is no dedicated route).
   */
  afterNavigate?: "open-notifications";
};

/**
 * Critical product surfaces for the smoke performance gate.
 * Authenticated routes use OWNER (full staff shell access).
 */
export const CRITICAL_ROUTES: CriticalRoute[] = [
  { name: "Home", path: "/" },
  { name: "Login", path: "/login" },
  { name: "Dashboard", path: "/app", role: "OWNER" },
  { name: "Batch List", path: "/app/batches", role: "OWNER" },
  {
    name: "Batch Details",
    path: `/app/batches/${SMOKE.kidsBatchId}`,
    role: "OWNER",
  },
  { name: "Students", path: "/app/students", role: "OWNER" },
  {
    name: "Attendance",
    path: `/app/sessions/${SMOKE.sessionAttendanceId}/attendance`,
    role: "OWNER",
  },
  { name: "Payments", path: "/app/payments", role: "OWNER" },
  {
    name: "Notifications",
    path: "/app",
    role: "OWNER",
    afterNavigate: "open-notifications",
  },
  { name: "Profile", path: "/app/profile", role: "OWNER" },
];
