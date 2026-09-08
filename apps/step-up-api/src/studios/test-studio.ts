/** Seeded e2e/smoke tenants (`e2e-test-studio`, `smoke-test-studio`, …). */
export function isTestStudioSlug(slug: string): boolean {
  return /(?:^|-)test(?:-|$)/.test(slug);
}

export function isIncludeTestQuery(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}
