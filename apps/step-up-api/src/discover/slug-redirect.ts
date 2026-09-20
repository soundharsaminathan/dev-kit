import { uniquifySlug } from "../tenancy/studio-slug";

export const MARKETPLACE_SLUG_KINDS = ["CLASS", "STUDIO", "TRAINER"] as const;

export type MarketplaceSlugKind = (typeof MARKETPLACE_SLUG_KINDS)[number];

export function slugifyMarketplaceName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "listing";
}

export function uniqueMarketplaceSlug(
  name: string,
  taken: Iterable<string>,
): string {
  return uniquifySlug(slugifyMarketplaceName(name), new Set(taken));
}

export function followSlugRedirects(
  start: string,
  redirects: Map<string, string>,
  limit = 8,
): string {
  let current = start;
  const seen = new Set<string>();
  for (let i = 0; i < limit; i += 1) {
    const next = redirects.get(current);
    if (!next || next === current || seen.has(next)) return current;
    seen.add(current);
    current = next;
  }
  return current;
}
