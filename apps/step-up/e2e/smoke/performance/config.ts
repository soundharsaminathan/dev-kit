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
 * Critical + high-load product surfaces for the smoke performance gate.
 * Staff/ops pages use OWNER; member surfaces use STUDENT.
 */
export const CRITICAL_ROUTES: CriticalRoute[] = [
  // Public
  { name: "Home", path: "/" },
  { name: "Login", path: "/login" },

  // Staff shell — lists, dashboards, and multi-query surfaces
  { name: "Dashboard", path: "/app", role: "OWNER" },
  { name: "Batch List", path: "/app/batches", role: "OWNER" },
  {
    name: "Batch Details",
    path: `/app/batches/${SMOKE.kidsBatchId}`,
    role: "OWNER",
  },
  { name: "Students", path: "/app/students", role: "OWNER" },
  {
    name: "Student Details",
    path: `/app/students/${SMOKE.users.STUDENT.id}`,
    role: "OWNER",
  },
  { name: "Trainers", path: "/app/trainers", role: "OWNER" },
  { name: "Bookings", path: "/app/bookings", role: "OWNER" },
  {
    name: "Attendance",
    path: `/app/sessions/${SMOKE.sessionAttendanceId}/attendance`,
    role: "OWNER",
  },
  { name: "Calendar", path: "/app/calendar", role: "OWNER" },
  { name: "Payments", path: "/app/payments", role: "OWNER" },
  { name: "Invoices", path: "/app/invoices", role: "OWNER" },
  { name: "Subscriptions", path: "/app/subscriptions", role: "OWNER" },
  { name: "Retention", path: "/app/retention", role: "OWNER" },
  { name: "Locations", path: "/app/locations", role: "OWNER" },
  {
    name: "Location Details",
    path: `/app/locations/${SMOKE.branchMainId}`,
    role: "OWNER",
  },
  { name: "Contests", path: "/app/contests", role: "OWNER" },
  { name: "Certificates", path: "/app/certificates", role: "OWNER" },
  { name: "Feed", path: "/app/feed", role: "OWNER" },
  { name: "Messages", path: "/app/messages", role: "OWNER" },
  {
    name: "Message Thread",
    path: `/app/messages/${SMOKE.conversationId}`,
    role: "OWNER",
  },
  {
    name: "Notifications",
    path: "/app",
    role: "OWNER",
    afterNavigate: "open-notifications",
  },
  { name: "Profile", path: "/app/profile", role: "OWNER" },
  { name: "Settings Billing", path: "/app/settings/billing", role: "OWNER" },

  // Student / member high-load surfaces
  { name: "Student Home", path: "/me", role: "STUDENT" },
  { name: "Discover Book", path: "/me/book", role: "STUDENT" },
  { name: "Student Calendar", path: "/me/calendar", role: "STUDENT" },
  { name: "Student Feed", path: "/me/feed", role: "STUDENT" },
  { name: "Student Attendance", path: "/me/attendance", role: "STUDENT" },
  { name: "Student Messages", path: "/me/messages", role: "STUDENT" },
  {
    name: "Student Message Thread",
    path: `/me/messages/${SMOKE.conversationId}`,
    role: "STUDENT",
  },
  {
    name: "Student Batch Details",
    path: `/me/batches/${SMOKE.trialBatchId}`,
    role: "STUDENT",
  },
];
