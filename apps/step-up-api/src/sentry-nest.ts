import type { DynamicModule, Provider, Type } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";

function sentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

/**
 * Load @sentry/nestjs only when SENTRY_DSN is set. Static imports pull
 * OpenTelemetry and can crash under Nest + pnpm (TracesSamplerValues).
 */
export function sentryNestImports(): DynamicModule[] {
  if (!sentryEnabled()) {
    return [];
  }

  const { SentryModule } =
    require("@sentry/nestjs/setup") as typeof import("@sentry/nestjs/setup");
  return [SentryModule.forRoot()];
}

export function sentryNestProviders(): Provider[] {
  if (!sentryEnabled()) {
    return [];
  }

  const { SentryGlobalFilter } =
    require("@sentry/nestjs/setup") as typeof import("@sentry/nestjs/setup");
  return [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ];
}

export function sentryExceptionFilters(): Type[] {
  if (!sentryEnabled()) {
    return [];
  }

  const { SentryGlobalFilter } =
    require("@sentry/nestjs/setup") as typeof import("@sentry/nestjs/setup");
  return [SentryGlobalFilter];
}
