import * as Sentry from "@sentry/react";
import type { AnyRouter } from "@tanstack/react-router";
import { getApiBaseUrl } from "@/lib/constants";

export function initSentry(router: AnyRouter) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const isProd = import.meta.env.PROD;
  const apiBase = getApiBaseUrl();

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    enableLogs: true,
    integrations: [
      Sentry.tanstackRouterBrowserTracingIntegration(router),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.consoleLoggingIntegration({
        levels: ["warn", "error"],
      }),
    ],
    tracesSampleRate: isProd ? 0.2 : 1,
    tracePropagationTargets: ["localhost", /^\//, apiBase],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
  });
}

export { Sentry };
