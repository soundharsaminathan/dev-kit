/**
 * Important Step Up routes for Lighthouse performance checks.
 * Authenticated routes require the existing smoke auth setup.
 */
export type PerfRoute = {
  name: string;
  path: string;
  /** Guest-accessible without Firebase session. */
  public?: boolean;
  role?: "OWNER" | "STUDENT";
};

export const LIGHTHOUSE_ROUTES: PerfRoute[] = [
  { name: "Home", path: "/", public: true },
  { name: "Login", path: "/login", public: true },

  { name: "Student Home", path: "/me", role: "STUDENT" },
  { name: "Student Feed", path: "/me/feed", role: "STUDENT" },
  { name: "Discover Book", path: "/me/book", role: "STUDENT" },
  { name: "Student Calendar", path: "/me/calendar", role: "STUDENT" },
  { name: "Student Messages", path: "/me/messages", role: "STUDENT" },
  { name: "Student Profile", path: "/me/profile", role: "STUDENT" },

  { name: "Dashboard", path: "/app", role: "OWNER" },
  { name: "Batches", path: "/app/batches", role: "OWNER" },
  { name: "Students", path: "/app/students", role: "OWNER" },
  { name: "Bookings", path: "/app/bookings", role: "OWNER" },
  { name: "Payments", path: "/app/payments", role: "OWNER" },
];

/** Target budgets (aspirational). */
export const PERF_TARGETS = {
  fcpMs: 1800,
  lcpMs: 2500,
  cls: 0.1,
  tbtMs: 200,
  performanceScore: 0.9,
} as const;

/**
 * Soft CI fail budgets — above these is a hard failure once the suite is
 * wired into CI. Start informational; tighten over time.
 */
export const PERF_SOFT_FAIL = {
  fcpMs: 4500,
  lcpMs: 5500,
  cls: 0.15,
  tbtMs: 1500,
  performanceScore: 0.4,
} as const;
