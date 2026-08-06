import type { Page, Request, Response } from "@playwright/test";
import { expect } from "@playwright/test";
import { waitForAppReady } from "../fixtures";
import { evaluatePage } from "./analyze";
import type { CriticalRoute } from "./config";
import type { PagePerfResult } from "./types";

type TrackedRequest = {
  url: string;
  resourceType: string;
  failed: boolean;
  status: number | null;
  timingMs: number | null;
  transferSize: number;
};

const DISABLE_ANIMATIONS_CSS = `
*, *::before, *::after {
  animation: none !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition: none !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  scroll-behavior: auto !important;
  caret-color: transparent !important;
}
`;

function shouldIgnoreRequest(request: Request) {
  const type = request.resourceType();
  if (type === "websocket" || type === "eventsource" || type === "media") {
    return true;
  }
  const url = request.url();
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.includes("socket.io") ||
    url.includes("/sockjs")
  ) {
    return true;
  }
  return false;
}

/**
 * Wait until in-flight HTTP(S) requests settle.
 * Ignores websockets / socket.io so realtime channels cannot hang the suite.
 */
export async function waitForHttpIdle(
  page: Page,
  getPending: () => number,
  timeout = 30_000,
) {
  await page.waitForLoadState("load");
  await expect
    .poll(() => getPending(), {
      timeout,
      intervals: [50, 100, 250, 500],
      message: "Timed out waiting for HTTP network idle",
    })
    .toBe(0);
}

/**
 * Install paint observers + animation kill-switch before any navigation.
 * Safe to call once per page/context.
 */
export async function preparePerfPage(page: Page) {
  await page.addInitScript((css) => {
    const w = window as Window & {
      __stepUpPerf?: {
        lcp: number | null;
        fcp: number | null;
      };
    };
    w.__stepUpPerf = { lcp: null, fcp: null };

    const style = document.createElement("style");
    style.setAttribute("data-perf-disable-animations", "true");
    style.textContent = css;
    const mount = () => {
      if (document.documentElement) {
        document.documentElement.appendChild(style);
      }
    };
    if (document.documentElement) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) w.__stepUpPerf!.lcp = last.startTime;
      });
      lcpObserver.observe({
        type: "largest-contentful-paint",
        buffered: true,
      } as PerformanceObserverInit);

      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            w.__stepUpPerf!.fcp = entry.startTime;
          }
        }
      });
      paintObserver.observe({ type: "paint", buffered: true });
    } catch {
      // Paint observers unavailable in some environments — metrics stay null.
    }
  }, DISABLE_ANIMATIONS_CSS);
}

function isApiUrl(url: string) {
  return (
    url.includes("/api/") ||
    /cloud\.run|step-up.*api|localhost:\d{4}/i.test(url) ||
    /\/(batches|students|notifications|billing|subscriptions|users|attendance)\b/i.test(
      url,
    )
  );
}

/**
 * Navigate to a critical route and collect smoke performance metrics.
 * Uses full document navigations (page.goto) for deterministic Navigation Timing.
 */
export async function measureRoute(
  page: Page,
  route: CriticalRoute,
): Promise<PagePerfResult> {
  const tracked = new Map<string, TrackedRequest>();
  const inflight = new Set<Request>();
  const consoleErrors: string[] = [];
  const failedUrls: string[] = [];

  const onRequest = (request: Request) => {
    if (shouldIgnoreRequest(request)) return;
    inflight.add(request);
    tracked.set(request.url(), {
      url: request.url(),
      resourceType: request.resourceType(),
      failed: false,
      status: null,
      timingMs: null,
      transferSize: 0,
    });
  };

  const onRequestDone = (request: Request) => {
    inflight.delete(request);
  };

  const onResponse = (response: Response) => {
    const request = response.request();
    if (shouldIgnoreRequest(request)) return;
    const url = request.url();
    const existing = tracked.get(url) ?? {
      url,
      resourceType: request.resourceType(),
      failed: false,
      status: null,
      timingMs: null,
      transferSize: 0,
    };
    existing.status = response.status();
    if (response.status() >= 400) {
      existing.failed = true;
      failedUrls.push(`${response.status()} ${url}`);
    }
    try {
      const timing = response.request().timing();
      existing.timingMs = timing.responseEnd;
    } catch {
      // timing may be unavailable for some responses
    }
    try {
      const headers = response.headers();
      const length = Number(headers["content-length"] ?? 0);
      if (Number.isFinite(length) && length > 0) {
        existing.transferSize = length;
      }
    } catch {
      // ignore
    }
    tracked.set(url, existing);
  };

  const onRequestFailed = (request: Request) => {
    if (shouldIgnoreRequest(request)) return;
    onRequestDone(request);
    const failure = request.failure();
    // Aborted navigations / replaced documents are not actionable failures.
    if (failure?.errorText === "net::ERR_ABORTED") return;

    const url = request.url();
    const existing = tracked.get(url) ?? {
      url,
      resourceType: request.resourceType(),
      failed: true,
      status: null,
      timingMs: null,
      transferSize: 0,
    };
    existing.failed = true;
    tracked.set(url, existing);
    failedUrls.push(`FAILED ${url}`);
  };

  const onRequestFinished = (request: Request) => {
    onRequestDone(request);
  };

  const onPageError = (error: Error) => {
    consoleErrors.push(error.message);
  };

  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);
  page.on("requestfinished", onRequestFinished);
  page.on("pageerror", onPageError);

  const wallStart = Date.now();
  try {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await waitForHttpIdle(page, () => inflight.size);
    await waitForAppReady(page);

    if (route.afterNavigate === "open-notifications") {
      const bell = page.getByTestId("notifications-bell");
      await bell.click();
      await expect(
        page.getByRole("dialog", { name: /notifications/i }),
      ).toBeVisible();
      await waitForHttpIdle(page, () => inflight.size);
    }

    const ttiApproxMs = Date.now() - wallStart;
    const navMetrics = await readNavigationMetrics(page);
    const paintMetrics = await readPaintMetrics(page);

    const requests = [...tracked.values()];
    const scripts = requests.filter((r) => r.resourceType === "script");
    const apiRequests = requests.filter((r) => isApiUrl(r.url));
    let longestRequestMs = 0;
    let longestRequestUrl: string | null = null;
    for (const r of requests) {
      if (r.timingMs != null && r.timingMs > longestRequestMs) {
        longestRequestMs = r.timingMs;
        longestRequestUrl = r.url;
      }
    }

    const reportPath =
      route.afterNavigate === "open-notifications"
        ? "/app#notifications"
        : route.path;

    return evaluatePage({
      name: route.name,
      path: reportPath,
      navigationMs: navMetrics.navigationMs,
      domContentLoadedMs: navMetrics.domContentLoadedMs,
      loadEventMs: navMetrics.loadEventMs,
      fcpMs: paintMetrics.fcpMs,
      lcpMs: paintMetrics.lcpMs,
      ttiApproxMs,
      requestCount: requests.length,
      failedRequestCount: requests.filter((r) => r.failed).length,
      consoleErrorCount: consoleErrors.length,
      consoleErrors: consoleErrors.slice(0, 10),
      failedRequestUrls: [...new Set(failedUrls)].slice(0, 20),
      resourceSummary: {
        scriptBytes: scripts.reduce((sum, r) => sum + r.transferSize, 0),
        scriptCount: scripts.length,
        apiRequestCount: apiRequests.length,
        longestRequestMs,
        longestRequestUrl,
      },
    });
  } finally {
    page.off("request", onRequest);
    page.off("response", onResponse);
    page.off("requestfailed", onRequestFailed);
    page.off("requestfinished", onRequestFinished);
    page.off("pageerror", onPageError);
  }
}

async function readNavigationMetrics(page: Page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!nav) {
      return {
        navigationMs: 0,
        domContentLoadedMs: null as number | null,
        loadEventMs: null as number | null,
      };
    }
    return {
      navigationMs: nav.duration || nav.loadEventEnd || nav.responseEnd,
      domContentLoadedMs: nav.domContentLoadedEventEnd || null,
      loadEventMs: nav.loadEventEnd || null,
    };
  });
}

async function readPaintMetrics(page: Page) {
  return page.evaluate(() => {
    const w = window as Window & {
      __stepUpPerf?: { lcp: number | null; fcp: number | null };
    };
    let fcp =
      w.__stepUpPerf?.fcp ??
      performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
      null;
    let lcp = w.__stepUpPerf?.lcp ?? null;

    if (lcp == null) {
      const lcpEntries = performance.getEntriesByType(
        "largest-contentful-paint",
      ) as PerformanceEntry[];
      if (lcpEntries.length) {
        lcp = lcpEntries[lcpEntries.length - 1]?.startTime ?? null;
      }
    }
    if (fcp == null) {
      const paints = performance.getEntriesByType("paint");
      const fcpEntry = paints.find((e) => e.name === "first-contentful-paint");
      fcp = fcpEntry?.startTime ?? null;
    }
    return { fcpMs: fcp, lcpMs: lcp };
  });
}
