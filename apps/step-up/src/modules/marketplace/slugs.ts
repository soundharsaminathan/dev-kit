import { categoryLabel } from "./search";
import type { PublicMarketplaceCategory } from "./types";

export function marketplaceTrainerSlug(item: {
  slug?: string | null;
  id: string;
}): string {
  return item.slug ?? item.id;
}

export function classDetailTitle(item: {
  name: string;
  studioName: string;
  locality: string | null;
}): string {
  return [item.name, item.studioName, item.locality]
    .filter(Boolean)
    .join(" · ");
}

export function studioDetailTitle(item: {
  name: string;
  locality: string | null;
  primaryCategory: PublicMarketplaceCategory;
}): string {
  return [item.name, item.locality, categoryLabel(item.primaryCategory)]
    .filter(Boolean)
    .join(" · ");
}

export function trainerDetailTitle(item: {
  name: string;
  categories: PublicMarketplaceCategory[];
  city: string | null;
}): string {
  const category = item.categories[0]
    ? categoryLabel(item.categories[0])
    : "Trainer";
  return item.city
    ? `${item.name} · ${category} in ${item.city}`
    : `${item.name} · ${category}`;
}
