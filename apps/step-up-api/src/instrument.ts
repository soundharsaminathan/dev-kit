import "dotenv/config";
import * as Sentry from "@sentry/nestjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
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
