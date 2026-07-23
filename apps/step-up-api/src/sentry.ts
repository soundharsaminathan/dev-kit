import * as Sentry from "@sentry/nestjs";

export function captureException(error: unknown): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.captureException(error);
}
