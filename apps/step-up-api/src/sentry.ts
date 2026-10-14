export function captureException(error: unknown): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  const Sentry = require("@sentry/nestjs") as typeof import("@sentry/nestjs");
  Sentry.captureException(error);
}
