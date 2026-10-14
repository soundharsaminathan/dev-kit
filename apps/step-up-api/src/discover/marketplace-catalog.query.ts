import type { BillingCadence } from "../generated/prisma/client";
import { dayBandsFromSchedule, timeBandsFromSchedule } from "./discover.schedule";
import {
  CLASS_LEVELS,
  defaultMarketplaceSort,
  emptyMarketplaceCopy,
  fieldMatchesTokens,
  hasPublicClassCover,
  hasPublicStudioCover,
  hasPublicTrainerPhoto,
  HOME_SESSION_WINDOW_DAYS,
  isJoinBookable,
  isPublicMarketplaceCategory,
  isTrialBookable,
  publicRatingOrNew,
  type ClassLevel,
  type MarketplaceSort,
  type PublicMarketplaceCategory,
  SEARCH_TRIGRAM_MIN_CHARS,
  SEARCH_TRIGRAM_MIN_SIMILARITY,
  seatCopy,
  tokenizeSearch,
} from "./marketplace.contract";
import type {
  MarketplaceCatalogFilters,
  MarketplaceCatalogTab,
  MarketplaceEmpty,
  MarketplaceRatingView,
} from "./marketplace-catalog.types";

export const CATALOG_DEFAULT_LIMIT = 24;
export const CATALOG_MAX_LIMIT = 48;

export function parseMarketplaceCategory(
  value: string | undefined,
): PublicMarketplaceCategory {
  const raw = value?.trim().toUpperCase();
  if (raw && isPublicMarketplaceCategory(raw)) return raw;
  const lower = value?.trim().toLowerCase();
  if (lower === "dance") return "DANCE";
  if (lower === "music") return "MUSIC";
  if (lower === "fitness") return "FITNESS";
  if (lower === "art") return "ART";
  return "DANCE";
}

export function parseMarketplaceSort(
  value: string | undefined,
  query?: string | null,
): MarketplaceSort {
  if (
    value === "availability" ||
    value === "relevance" ||
    value === "nearest" ||
    value === "earliest" ||
    value === "price" ||
    value === "rating" ||
    value === "popularity"
  ) {
    return value;
  }
  return defaultMarketplaceSort(query);
}

export function parseClassLevel(value: string | undefined): ClassLevel | undefined {
  const raw = value?.trim().toUpperCase();
  if (raw && (CLASS_LEVELS as readonly string[]).includes(raw)) {
    return raw as ClassLevel;
  }
  return undefined;
}

export function effectiveMarketplaceSort(
  sort: MarketplaceSort,
  filters: Pick<MarketplaceCatalogFilters, "lat" | "lng">,
): MarketplaceSort {
  if (sort === "nearest" && (filters.lat == null || filters.lng == null)) {
    return "availability";
  }
  return sort;
}

export function catalogLimit(limit?: number): number {
  return Math.min(Math.max(limit ?? CATALOG_DEFAULT_LIMIT, 1), CATALOG_MAX_LIMIT);
}

export function toRatingView(
  avg: number | null,
  count: number,
): MarketplaceRatingView {
  const view = publicRatingOrNew(count, avg);
  if (view.visible) return { visible: true, avg: view.avg, count };
  return { visible: false, label: "New", count };
}

export function lowestPlan(plans: Array<{
  active: boolean;
  price: number;
  cadence: BillingCadence;
}>): { price: number; cadence: BillingCadence } | null {
  let best: { price: number; cadence: BillingCadence } | null = null;
  for (const plan of plans) {
    if (!plan.active || !Number.isFinite(plan.price)) continue;
    if (!best || plan.price < best.price) {
      best = { price: plan.price, cadence: plan.cadence };
    }
  }
  return best;
}

export function audienceMatches(
  classAudience: "KIDS" | "ADULTS" | "BOTH",
  filter?: "KIDS" | "ADULTS",
): boolean {
  if (!filter) return true;
  return classAudience === "BOTH" || classAudience === filter;
}

export function withinHomeSessionWindow(
  nextSessionAt: Date | null,
  now = new Date(),
): boolean {
  if (!nextSessionAt) return false;
  if (nextSessionAt.getTime() <= now.getTime()) return false;
  const horizon = now.getTime() + HOME_SESSION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return nextSessionAt.getTime() <= horizon;
}

export function classPassesPublicGates(input: {
  coverImageUrl?: string | null;
  studioActive: boolean;
  publicClasses: boolean;
  hasBranch: boolean;
  hasSchedule: boolean;
  testStudio: boolean;
}): boolean {
  return (
    !input.testStudio &&
    input.studioActive &&
    input.publicClasses &&
    input.hasBranch &&
    input.hasSchedule &&
    hasPublicClassCover(input.coverImageUrl)
  );
}

export function studioPassesPublicGates(input: {
  studioActive: boolean;
  publicStudioListing: boolean;
  testStudio: boolean;
  heroDesktopUrl?: string | null;
  heroMobileUrl?: string | null;
  branchCoverUrl?: string | null;
  inventoryInCategory: boolean;
}): boolean {
  return (
    !input.testStudio &&
    input.studioActive &&
    input.publicStudioListing &&
    input.inventoryInCategory &&
    hasPublicStudioCover({
      heroDesktopUrl: input.heroDesktopUrl,
      heroMobileUrl: input.heroMobileUrl,
      branchCoverUrl: input.branchCoverUrl,
    })
  );
}

export function trainerPassesPublicGates(input: {
  photoUrl?: string | null;
  hasCategory: boolean;
  listedAtPublicStudio: boolean;
  independent: boolean;
}): boolean {
  return (
    hasPublicTrainerPhoto(input.photoUrl) &&
    input.hasCategory &&
    (input.listedAtPublicStudio || input.independent)
  );
}

export function scheduleMatchesFilters(
  schedule: unknown,
  filters: Pick<MarketplaceCatalogFilters, "days" | "time">,
): boolean {
  if (filters.days) {
    const days = dayBandsFromSchedule(schedule);
    if (filters.days === "weekday" && !days.weekday) return false;
    if (filters.days === "weekend" && !days.weekend) return false;
  }
  if (filters.time) {
    const times = timeBandsFromSchedule(schedule);
    if (filters.time === "morning" && !times.morning) return false;
    if (filters.time === "evening" && !times.evening) return false;
  }
  return true;
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

export function nameSimilarity(left: string, right: string): number {
  const a = trigrams(left.toLowerCase());
  const b = trigrams(right.toLowerCase());
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const gram of a) {
    if (b.has(gram)) overlap += 1;
  }
  return (2 * overlap) / (a.size + b.size);
}

export function searchFieldsMatch(
  fields: string[],
  query: string,
): { matched: boolean; score: number } {
  return searchRelevance({ names: fields, styles: [], related: [] }, query);
}

export function searchRelevance(
  input: { names: string[]; styles: string[]; related: string[] },
  query: string,
): { matched: boolean; score: number } {
  const tokens = tokenizeSearch(query);
  if (tokens.length === 0) return { matched: true, score: 0 };

  const names = input.names.filter(Boolean);
  const styles = input.styles.filter(Boolean);
  const related = input.related.filter(Boolean);
  const all = [...names, ...styles, ...related];
  const matchedTokens = tokens.every((token) =>
    all.some((field) => fieldMatchesTokens(field, [token])),
  );

  if (matchedTokens) {
    const first = tokens[0] ?? "";
    if (
      names.some((field) =>
        field.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().startsWith(first),
      )
    ) {
      return { matched: true, score: 400 };
    }
    if (names.some((field) => fieldMatchesTokens(field, tokens))) {
      return { matched: true, score: 300 };
    }
    if (styles.some((field) => fieldMatchesTokens(field, tokens))) {
      return { matched: true, score: 200 };
    }
    return { matched: true, score: 100 };
  }

  const compact = query.trim().replace(/\s+/g, "");
  if (compact.length < SEARCH_TRIGRAM_MIN_CHARS) {
    return { matched: false, score: 0 };
  }

  let best = 0;
  for (const field of names) {
    best = Math.max(best, nameSimilarity(field, query));
  }
  if (best >= SEARCH_TRIGRAM_MIN_SIMILARITY) {
    return { matched: true, score: Math.round(best * 100) };
  }
  return { matched: false, score: 0 };
}

export type SortableCatalogItem = {
  bookable: boolean;
  distanceKm: number | null;
  nextAt: number | null;
  priceFrom: number | null;
  ratingAvg: number | null;
  ratingCount: number;
  popularity: number;
  name: string;
  searchScore: number;
};

export function compareCatalogItems(
  left: SortableCatalogItem,
  right: SortableCatalogItem,
  sort: MarketplaceSort,
): number {
  const byName = () => left.name.localeCompare(right.name);

  const byBookable = () => Number(right.bookable) - Number(left.bookable);
  const byNearest = () => {
    if (left.distanceKm == null && right.distanceKm == null) return 0;
    if (left.distanceKm == null) return 1;
    if (right.distanceKm == null) return -1;
    return left.distanceKm - right.distanceKm;
  };
  const byEarliest = () => {
    if (left.nextAt == null && right.nextAt == null) return 0;
    if (left.nextAt == null) return 1;
    if (right.nextAt == null) return -1;
    return left.nextAt - right.nextAt;
  };
  const byPrice = () => {
    if (left.priceFrom == null && right.priceFrom == null) return 0;
    if (left.priceFrom == null) return 1;
    if (right.priceFrom == null) return -1;
    return left.priceFrom - right.priceFrom;
  };
  const byRating = () => {
    const leftRated = left.ratingCount >= 3 && left.ratingAvg != null;
    const rightRated = right.ratingCount >= 3 && right.ratingAvg != null;
    if (leftRated !== rightRated) return Number(rightRated) - Number(leftRated);
    if (leftRated && rightRated) {
      const avg = (right.ratingAvg ?? 0) - (left.ratingAvg ?? 0);
      if (avg !== 0) return avg;
      return right.ratingCount - left.ratingCount;
    }
    return 0;
  };

  const availabilityTie = () =>
    byBookable() || byNearest() || byEarliest() || byRating() || byName();

  if (sort === "nearest") return byNearest() || availabilityTie();
  if (sort === "earliest") return byEarliest() || availabilityTie();
  if (sort === "price") return byPrice() || availabilityTie();
  if (sort === "rating") return byRating() || byName();
  if (sort === "popularity") {
    const pop = right.popularity - left.popularity;
    if (pop !== 0) return pop;
    return right.ratingCount - left.ratingCount || byName();
  }
  if (sort === "relevance") {
    const score = right.searchScore - left.searchScore;
    if (score !== 0) return score;
    return availabilityTie();
  }
  return availabilityTie();
}

export function catalogEmpty(
  itemsLength: number,
  filters: MarketplaceCatalogFilters,
  tab: MarketplaceCatalogTab,
  siblingCount: number,
  categoryLabel: string,
  cityLabel: string,
): MarketplaceEmpty {
  if (itemsLength > 0) return { kind: null, message: null };
  const hasNarrow =
    Boolean(filters.q) ||
    Boolean(filters.audience) ||
    Boolean(filters.level) ||
    Boolean(filters.locality) ||
    Boolean(filters.days) ||
    Boolean(filters.time) ||
    filters.maxPrice != null ||
    filters.maxKm != null ||
    Boolean(filters.style);
  if (hasNarrow) {
    return {
      kind: "filters",
      message: emptyMarketplaceCopy({
        kind: "filters",
        category: categoryLabel,
        city: cityLabel,
        tab,
      }),
    };
  }
  if (siblingCount > 0) {
    return {
      kind: "tab",
      message: emptyMarketplaceCopy({
        kind: "tab",
        category: categoryLabel,
        city: cityLabel,
        tab,
      }),
    };
  }
  return {
    kind: "category",
    message: emptyMarketplaceCopy({
      kind: "category",
      category: categoryLabel,
      city: cityLabel,
    }),
  };
}

export function categoryLabel(
  category: PublicMarketplaceCategory,
): string {
  const found = {
    DANCE: "Dance",
    MUSIC: "Music",
    FITNESS: "Fitness",
    ART: "Art",
  }[category];
  return found;
}

export function usesMarketplaceCatalogQuery(query: {
  sort?: string;
  level?: string;
  category?: string;
}): boolean {
  if (query.sort || query.level) return true;
  const category = query.category?.trim();
  if (!category) return false;
  return isPublicMarketplaceCategory(category);
}

export { isTrialBookable, isJoinBookable, seatCopy };
