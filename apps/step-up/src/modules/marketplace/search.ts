import {
  marketplaceSeoPath,
  parseMarketplacePlace,
} from "./place";
import {
  CLASS_LEVELS,
  defaultMarketplaceSort,
  MARKETPLACE_SORTS,
  marketplaceFirstPaint,
  PUBLIC_MARKETPLACE_CATEGORIES,
  type ClassLevel,
  type MarketplaceCatalogQuery,
  type MarketplaceCatalogTab,
  type MarketplaceSort,
  type PublicMarketplaceCategory,
} from "./types";

export const MARKETPLACE_CATEGORY_KEY = "classa-marketplace-category";

export type MarketplaceWhen = "today" | "tomorrow";
export type MarketplaceView = "list" | "map";

export type MarketplaceUrlSearch = {
  category?: PublicMarketplaceCategory | undefined;
  city?: string | undefined;
  q?: string | undefined;
  style?: string | undefined;
  audience?: "KIDS" | "ADULTS" | undefined;
  level?: ClassLevel | undefined;
  days?: "weekday" | "weekend" | undefined;
  time?: "morning" | "evening" | undefined;
  locality?: string | undefined;
  sort?: MarketplaceSort | undefined;
  when?: MarketplaceWhen | undefined;
  view?: MarketplaceView | undefined;
  tab?: MarketplaceCatalogTab | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
};

const CATEGORY_LABELS: Record<PublicMarketplaceCategory, string> = {
  DANCE: "Dance",
  MUSIC: "Music",
  FITNESS: "Fitness",
  ART: "Art",
};

const TAB_LABELS: Record<MarketplaceCatalogTab, string> = {
  classes: "Classes",
  studios: "Studios",
  trainers: "Trainers",
};

const LEGACY_CATEGORY: Record<string, PublicMarketplaceCategory> = {
  dance: "DANCE",
  music: "MUSIC",
  fitness: "FITNESS",
  art: "ART",
};

export function categoryLabel(category: PublicMarketplaceCategory): string {
  return CATEGORY_LABELS[category];
}

export function tabLabel(tab: MarketplaceCatalogTab): string {
  return TAB_LABELS[tab];
}

export function marketplaceTitle(
  category: PublicMarketplaceCategory,
  cityLabel: string,
  tab: MarketplaceCatalogTab,
): string {
  const noun =
    tab === "classes"
      ? "classes"
      : tab === "studios"
        ? "studios"
        : "trainers";
  return `${categoryLabel(category)} ${noun} in ${cityLabel}`;
}

export function isMarketplaceCategory(
  value: string,
): value is PublicMarketplaceCategory {
  return (PUBLIC_MARKETPLACE_CATEGORIES as readonly string[]).includes(value);
}

export function parseMarketplaceCategory(
  value: unknown,
  fallback: PublicMarketplaceCategory = marketplaceFirstPaint().category,
): PublicMarketplaceCategory {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  const upper = raw.toUpperCase();
  if (isMarketplaceCategory(upper)) return upper;
  return LEGACY_CATEGORY[raw.toLowerCase()] ?? fallback;
}

export function readStoredCategory(): PublicMarketplaceCategory | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(MARKETPLACE_CATEGORY_KEY);
    if (stored && isMarketplaceCategory(stored)) return stored;
  } catch {
    return null;
  }
  return null;
}

export function writeStoredCategory(category: PublicMarketplaceCategory) {
  try {
    window.localStorage.setItem(MARKETPLACE_CATEGORY_KEY, category);
  } catch {
    /* ignore quota / private mode */
  }
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function parseMarketplaceSearch(
  search: Record<string, unknown>,
): MarketplaceUrlSearch {
  const paint = marketplaceFirstPaint();
  const result: MarketplaceUrlSearch = {
    category: parseMarketplaceCategory(
      search.category,
      readStoredCategory() ?? paint.category,
    ),
    city: parseOptionalString(search.city)?.toLowerCase() ?? paint.city,
  };
  const q = parseOptionalString(search.q);
  if (q) result.q = q;
  const style = parseOptionalString(search.style);
  if (style) result.style = style;
  if (search.audience === "KIDS" || search.audience === "ADULTS") {
    result.audience = search.audience;
  }
  const level = String(search.level ?? "").toUpperCase();
  if ((CLASS_LEVELS as readonly string[]).includes(level)) {
    result.level = level as ClassLevel;
  }
  if (search.days === "weekday" || search.days === "weekend") {
    result.days = search.days;
  }
  if (search.time === "morning" || search.time === "evening") {
    result.time = search.time;
  }
  const locality = parseOptionalString(search.locality)?.toLowerCase();
  if (locality) result.locality = locality;
  if (
    typeof search.sort === "string" &&
    (MARKETPLACE_SORTS as readonly string[]).includes(search.sort)
  ) {
    result.sort = search.sort as MarketplaceSort;
  }
  if (search.when === "today" || search.when === "tomorrow") {
    result.when = search.when;
  }
  if (search.view === "map" || search.view === "list") {
    result.view = search.view;
  }
  if (
    search.tab === "classes" ||
    search.tab === "studios" ||
    search.tab === "trainers"
  ) {
    result.tab = search.tab;
  }
  const lat = parseOptionalNumber(search.lat);
  const lng = parseOptionalNumber(search.lng);
  if (lat != null) result.lat = lat;
  if (lng != null) result.lng = lng;
  return result;
}

export function marketplaceCatalogQuery(
  search: MarketplaceUrlSearch,
): MarketplaceCatalogQuery {
  const paint = marketplaceFirstPaint();
  const q = search.q;
  const query: MarketplaceCatalogQuery = {
    category: search.category ?? paint.category,
    city: search.city ?? paint.city,
    sort: search.sort ?? defaultMarketplaceSort(q),
    limit: 24,
  };
  if (q) query.q = q;
  if (search.style) query.style = search.style;
  if (search.audience) query.audience = search.audience;
  if (search.level) query.level = search.level;
  if (search.days) query.days = search.days;
  if (search.time) query.time = search.time;
  if (search.locality) query.locality = search.locality;
  if (search.lat != null && search.lng != null) {
    query.lat = search.lat;
    query.lng = search.lng;
  }
  return query;
}

export function marketplacePathForTab(
  tab: MarketplaceCatalogTab,
  embed: "public" | "member" = "public",
  search?: MarketplaceUrlSearch,
): "/" | "/classes" | "/studios" | "/trainers" | "/me/book" | "/$city/$place" {
  if (embed === "member") return "/me/book";
  if (
    search &&
    marketplaceSeoPath({
      city: search.city,
      style: search.style,
      locality: search.locality,
    })
  ) {
    return "/$city/$place";
  }
  if (tab === "studios") return "/studios";
  if (tab === "trainers") return "/trainers";
  if (tab === "classes") return "/classes";
  return "/";
}

export function marketplaceTabSearch(
  search: MarketplaceUrlSearch,
  tab: MarketplaceCatalogTab,
  embed: "public" | "member" = "public",
): MarketplaceUrlSearch {
  if (embed === "member") return { ...search, tab };
  if (marketplacePathForTab(tab, embed, search) === "/$city/$place") {
    return { ...search, tab: tab === "classes" ? undefined : tab };
  }
  return { ...search, tab: undefined };
}

export function marketplacePlaceParams(
  search: MarketplaceUrlSearch,
): { city: string; place: string } | null {
  if (
    !marketplaceSeoPath({
      city: search.city,
      style: search.style,
      locality: search.locality,
    })
  ) {
    return null;
  }
  const city = search.city;
  const place = search.style ?? search.locality;
  if (!city || !place) return null;
  return { city, place };
}

export function marketplacePlaceFromSearch(
  search: MarketplaceUrlSearch,
): ReturnType<typeof parseMarketplacePlace> {
  return parseMarketplacePlace(search.style) ?? parseMarketplacePlace(search.locality);
}

export function marketplaceFilterOnly(search: MarketplaceUrlSearch): boolean {
  return Boolean(
    search.q ||
      search.audience ||
      search.level ||
      search.days ||
      search.time ||
      search.when,
  );
}

export function marketplaceCanonicalPath(
  search: MarketplaceUrlSearch,
  tab: MarketplaceCatalogTab,
): string {
  const seo = marketplaceSeoPath({
    city: search.city,
    style: search.style,
    locality: search.locality,
  });
  if (seo) return tab === "classes" ? seo : `${seo}?tab=${tab}`;
  if (tab === "studios") return "/studios";
  if (tab === "trainers") return "/trainers";
  return "/";
}

export function marketplacePageShouldIndex(
  search: MarketplaceUrlSearch,
  hasItems: boolean,
  onPlaceRoute = false,
): boolean {
  if (!hasItems) return false;
  if (marketplaceFilterOnly(search)) return false;
  if (search.style && search.locality) return false;
  const seo = marketplaceSeoPath({
    city: search.city,
    style: search.style,
    locality: search.locality,
  });
  if (seo && !onPlaceRoute) return false;
  return true;
}

export function marketplaceNavigateArgs(
  tab: MarketplaceCatalogTab,
  search: MarketplaceUrlSearch,
  embed: "public" | "member" = "public",
): {
  to: "/" | "/classes" | "/studios" | "/trainers" | "/me/book" | "/$city/$place";
  params?: { city: string; place: string };
  search: MarketplaceUrlSearch;
} {
  const to = marketplacePathForTab(tab, embed, search);
  const nextSearch = marketplaceTabSearch(search, tab, embed);
  if (to === "/$city/$place") {
    const params = marketplacePlaceParams(search);
    const { city: _city, style: _style, locality: _locality, ...rest } =
      nextSearch;
    if (params) return { to, params, search: rest };
    return { to: "/", search: rest };
  }
  return { to, search: nextSearch };
}

export function toggleAudience(
  current: MarketplaceUrlSearch["audience"],
  next: "KIDS" | "ADULTS",
): "KIDS" | "ADULTS" | undefined {
  return current === next ? undefined : next;
}

export function toggleLevel(
  current: MarketplaceUrlSearch["level"],
  next: ClassLevel,
): ClassLevel | undefined {
  return current === next ? undefined : next;
}

export function isSameLocalDay(iso: string | null | undefined, day: Date): boolean {
  if (!iso) return false;
  const value = new Date(iso);
  return (
    value.getFullYear() === day.getFullYear() &&
    value.getMonth() === day.getMonth() &&
    value.getDate() === day.getDate()
  );
}

export function matchesWhenFilter(
  nextAt: string | null | undefined,
  when: MarketplaceWhen | undefined,
  now = new Date(),
): boolean {
  if (!when) return true;
  const target = new Date(now);
  if (when === "tomorrow") target.setDate(target.getDate() + 1);
  return isSameLocalDay(nextAt, target);
}

export function mapDiscoverToMarketplace(
  search: Record<string, unknown>,
): MarketplaceUrlSearch {
  return parseMarketplaceSearch(search);
}

export function hasNarrowFilters(search: MarketplaceUrlSearch): boolean {
  return Boolean(
    search.q ||
      search.style ||
      search.audience ||
      search.level ||
      search.days ||
      search.time ||
      search.locality ||
      search.when,
  );
}

export function clearMarketplaceFilters(
  search: MarketplaceUrlSearch,
): MarketplaceUrlSearch {
  return {
    category: search.category,
    city: search.city,
    view: search.view,
  };
}
