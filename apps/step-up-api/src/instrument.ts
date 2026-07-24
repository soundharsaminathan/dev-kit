import "dotenv/config";

function sentryDisabled(): boolean {
  return (
    process.env.SENTRY_DISABLED === "true" ||
    process.env.SENTRY_ENVIRONMENT === "e2e" ||
    process.env.STEP_UP_E2E === "true"
  );
}

if (sentryDisabled()) {
  // Playwright / local e2e must not load @sentry/nestjs — OpenTelemetry
  // resolution under pnpm can crash on TracesSamplerValues, and empty
  // SENTRY_DSN env vars are dropped by some shells so dotenv would re-apply
  // the real DSN from .env.
  delete process.env.SENTRY_DSN;
}

if (process.env.STEP_UP_E2E === "true") {
  // Same empty-env drop issue as SENTRY_DSN: Playwright cannot reliably clear
  // REDIS_URL via the process environment, so dotenv would re-apply a remote
  // Redis and e2e requests 500 when the quota is exhausted. Keep an explicit
  // empty string so later dotenv/ConfigModule loads do not revive the URL.
  process.env.REDIS_URL = "";
}

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  // Lazy-load so runs without a DSN never pull OpenTelemetry.
  const Sentry = require("@sentry/nestjs") as typeof import("@sentry/nestjs");
  const isProd = process.env.NODE_ENV === "production";

  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    sendDefaultPii: false,
    enableLogs: true,
    tracesSampleRate: isProd ? 0.2 : 1,
    integrations: [
      Sentry.consoleLoggingIntegration({
        levels: ["warn", "error"],
      }),
    ],
  });
}
