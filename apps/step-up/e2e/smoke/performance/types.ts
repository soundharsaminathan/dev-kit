export type PerfStatus = "PASS" | "FAIL";

export type PerfPrimaryCause =
  | "large_bundle"
  | "excessive_api_calls"
  | "blocking_requests"
  | "render_delay"
  | "console_errors"
  | "failed_requests"
  | "slow_navigation"
  | "unknown";

export type PagePerfResult = {
  name: string;
  path: string;
  navigationMs: number;
  domContentLoadedMs: number | null;
  loadEventMs: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  ttiApproxMs: number;
  requestCount: number;
  failedRequestCount: number;
  consoleErrorCount: number;
  consoleErrors: string[];
  failedRequestUrls: string[];
  resourceSummary: {
    scriptBytes: number;
    scriptCount: number;
    apiRequestCount: number;
    longestRequestMs: number;
    longestRequestUrl: string | null;
  };
  status: PerfStatus;
  failures: string[];
  primaryCause: PerfPrimaryCause | null;
  recommendations: string[];
  regression?: {
    metric: string;
    previousMs: number;
    currentMs: number;
    deltaMs: number;
  }[];
};

export type PerfReport = {
  generatedAt: string;
  thresholds: {
    lcpMs: number;
    navigationMs: number;
    maxFailedRequests: number;
  };
  pages: PagePerfResult[];
  slowestByLoad: { path: string; loadMs: number; status: PerfStatus }[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

export type PerfBaseline = {
  generatedAt?: string;
  pages: {
    path: string;
    navigationMs: number;
    lcpMs: number | null;
    ttiApproxMs: number;
  }[];
};
