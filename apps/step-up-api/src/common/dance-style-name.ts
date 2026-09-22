export const CANONICAL_FREE_STYLE_LABEL = "Free Style";

function normalizeStyleName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isFreeStyleName(value: string): boolean {
  const normalized = normalizeStyleName(value);
  if (!normalized) return false;
  return /\bfree\b/.test(normalized) || normalized.includes("freestyle");
}

export function canonicalizeFreeStyleName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return isFreeStyleName(trimmed) ? CANONICAL_FREE_STYLE_LABEL : trimmed;
}

export function styleIdentityKey(value: string): string {
  return canonicalizeFreeStyleName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function canonicalizeStyleList(styles: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const style of styles) {
    const label = canonicalizeFreeStyleName(style);
    if (!label) continue;
    const key = styleIdentityKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

export function canonicalizeDanceCategories<T extends { name: string }>(
  categories: T[],
): T[] {
  return categories.map((category) => ({
    ...category,
    name: canonicalizeFreeStyleName(category.name),
  }));
}
