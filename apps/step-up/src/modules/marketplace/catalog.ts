import { getPublic } from "@/lib/api";
import {
  defaultMarketplaceSort,
  marketplaceFirstPaint,
  type MarketplaceCatalogPage,
  type MarketplaceCatalogQuery,
  type MarketplaceClassCard,
  type MarketplaceClassDetail,
  type MarketplaceStudioCard,
  type MarketplaceTrainerCard,
  type MarketplaceTrainerDetail,
} from "./types";

export function buildMarketplaceQuery(
  params: MarketplaceCatalogQuery = {},
): string {
  const paint = marketplaceFirstPaint();
  const search = new URLSearchParams();
  const category = params.category ?? paint.category;
  const city = params.city ?? paint.city;
  const sort = params.sort ?? defaultMarketplaceSort(params.q);
  search.set("category", category);
  search.set("city", city);
  search.set("sort", sort);
  if (params.q) search.set("q", params.q);
  if (params.style) search.set("style", params.style);
  if (params.locality) search.set("locality", params.locality);
  if (params.audience) search.set("audience", params.audience);
  if (params.level) search.set("level", params.level);
  if (params.days) search.set("days", params.days);
  if (params.time) search.set("time", params.time);
  if (params.lat != null) search.set("lat", String(params.lat));
  if (params.lng != null) search.set("lng", String(params.lng));
  if (params.maxKm != null) search.set("maxKm", String(params.maxKm));
  if (params.maxPrice != null) search.set("maxPrice", String(params.maxPrice));
  if (params.limit != null) search.set("limit", String(params.limit));
  return `?${search.toString()}`;
}

export function fetchMarketplaceClasses(params: MarketplaceCatalogQuery = {}) {
  return getPublic<MarketplaceCatalogPage<MarketplaceClassCard>>(
    `/discover/classes${buildMarketplaceQuery(params)}`,
  );
}

export function fetchMarketplaceStudios(params: MarketplaceCatalogQuery = {}) {
  return getPublic<MarketplaceCatalogPage<MarketplaceStudioCard>>(
    `/discover/studios${buildMarketplaceQuery(params)}`,
  );
}

export function fetchMarketplaceTrainers(
  params: MarketplaceCatalogQuery = {},
) {
  return getPublic<MarketplaceCatalogPage<MarketplaceTrainerCard>>(
    `/discover/trainers${buildMarketplaceQuery(params)}`,
  );
}

export function fetchMarketplaceClass(idOrSlug: string) {
  return getPublic<MarketplaceClassDetail>(
    `/discover/classes/${encodeURIComponent(idOrSlug)}`,
  );
}

export function fetchMarketplaceTrainer(idOrSlug: string) {
  return getPublic<MarketplaceTrainerDetail>(
    `/discover/trainers/${encodeURIComponent(idOrSlug)}`,
  );
}

export function marketplaceClassesQueryKey(params: MarketplaceCatalogQuery) {
  return ["marketplace-classes", params] as const;
}

export function marketplaceStudiosQueryKey(params: MarketplaceCatalogQuery) {
  return ["marketplace-studios", params] as const;
}

export function marketplaceTrainersQueryKey(params: MarketplaceCatalogQuery) {
  return ["marketplace-trainers", params] as const;
}

export function marketplaceClassQueryKey(idOrSlug: string) {
  return ["marketplace-class", idOrSlug] as const;
}

export function marketplaceTrainerQueryKey(idOrSlug: string) {
  return ["marketplace-trainer", idOrSlug] as const;
}
