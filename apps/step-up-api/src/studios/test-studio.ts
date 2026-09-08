/** Seeded e2e/smoke tenants and leftover journey studios (`E2E Owner Login …`). */
const TEST_PREFIX = /^(e2e|http|smoke)([- ]|$)/i;

function looksLikeTestLabel(value: string): boolean {
  const label = value.trim().toLowerCase();
  return TEST_PREFIX.test(label) || /(?:^|-)test(?:-|$)/.test(label);
}

export function isTestStudio(studio: { slug: string; name: string }): boolean {
  return looksLikeTestLabel(studio.slug) || looksLikeTestLabel(studio.name);
}

export function isIncludeTestQuery(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}
