import {
  categoriesFromDanceCategories,
  categoriesFromStyles,
  danceCategoryEntries,
  resolveStyleEntry,
  type DiscoverCategoryId,
} from "./discover.categories";
import {
  classAudienceFromBatchCategory,
  isPublicMarketplaceCategory,
  type PublicMarketplaceCategory,
} from "./marketplace.contract";

const PUBLIC_ORDER: PublicMarketplaceCategory[] = [
  "DANCE",
  "MUSIC",
  "FITNESS",
  "ART",
];

export function marketplaceCategoryFromDiscover(
  categoryId: DiscoverCategoryId,
): PublicMarketplaceCategory {
  if (categoryId === "music") return "MUSIC";
  if (categoryId === "fitness") return "FITNESS";
  if (categoryId === "art") return "ART";
  return "DANCE";
}

export function marketplaceCategoryFromStyles(
  danceCategories: unknown,
): PublicMarketplaceCategory {
  const first = danceCategoryEntries(danceCategories)[0];
  if (!first) return "DANCE";
  return marketplaceCategoryFromDiscover(resolveStyleEntry(first).categoryId);
}

export function studioMarketplaceCategories(
  batchDanceCategories: unknown[],
): {
  categories: PublicMarketplaceCategory[];
  primary: PublicMarketplaceCategory;
} {
  const counts = new Map<PublicMarketplaceCategory, number>();
  for (const danceCategories of batchDanceCategories) {
    for (const id of categoriesFromDanceCategories(danceCategories)) {
      const category = marketplaceCategoryFromDiscover(id);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  const categories = (
    PUBLIC_ORDER.filter((category) => counts.has(category))
  );
  if (categories.length === 0) {
    return { categories: ["DANCE"], primary: "DANCE" };
  }
  let primary = categories[0] ?? "DANCE";
  let best = 0;
  for (const category of categories) {
    const count = counts.get(category) ?? 0;
    if (count > best) {
      primary = category;
      best = count;
    }
  }
  return { categories, primary };
}

export function trainerMarketplaceCategories(input: {
  styles?: string[];
  batchDanceCategories?: unknown[];
}): PublicMarketplaceCategory[] {
  const fromStyles = categoriesFromStyles(input.styles ?? []).map(
    marketplaceCategoryFromDiscover,
  );
  const fromBatches = (input.batchDanceCategories ?? []).flatMap((value) =>
    categoriesFromDanceCategories(value).map(marketplaceCategoryFromDiscover),
  );
  const seen = new Set<PublicMarketplaceCategory>();
  for (const category of [...fromStyles, ...fromBatches]) {
    if (isPublicMarketplaceCategory(category)) seen.add(category);
  }
  const ordered = PUBLIC_ORDER.filter((category) => seen.has(category));
  return ordered.length > 0 ? ordered : ["DANCE"];
}

export function backfillClassAudience(category: "KIDS" | "ADULTS") {
  return classAudienceFromBatchCategory(category);
}

export function trainerStudioBackfillRows(
  trainers: Array<{ id: string; studioId: string | null }>,
): Array<{ trainerId: string; studioId: string; isHome: true }> {
  return trainers.flatMap((trainer) =>
    trainer.studioId
      ? [{ trainerId: trainer.id, studioId: trainer.studioId, isHome: true }]
      : [],
  );
}
