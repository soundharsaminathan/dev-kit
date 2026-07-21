export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  console.info(
    `[sentry] stub initialized for ${process.env.SENTRY_ENVIRONMENT ?? "development"}`,
  );
}

export function captureException(error: unknown): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  console.error("[sentry] captureException stub", error);
}
