import { getPublic } from "@/lib/api";
import {
  defaultMarketplaceSort,
  marketplaceFirstPaint,
  type MarketplaceCatalogPage,
  type MarketplaceCatalogQuery,
  type MarketplaceClassCard,
  type MarketplaceClassDetail,
  type MarketplaceFetchAuth,
  type MarketplaceStudioCard,
  type MarketplaceStudioDetail,
  type MarketplaceTrainerCard,
  type MarketplaceTrainerDetail,
} from "./types";

export function buildMarketplaceQuery(
  params: MarketplaceCatalogQuery = {},
  auth?: MarketplaceFetchAuth,
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
  if (auth?.studentId) search.set("studentId", auth.studentId);
  return `?${search.toString()}`;
}

function catalogInit(auth?: MarketplaceFetchAuth) {
  return auth?.token ? { token: auth.token } : undefined;
}

export function fetchMarketplaceClasses(
  params: MarketplaceCatalogQuery = {},
  auth?: MarketplaceFetchAuth,
) {
  return getPublic<MarketplaceCatalogPage<MarketplaceClassCard>>(
    `/discover/classes${buildMarketplaceQuery(params, auth)}`,
    catalogInit(auth),
  );
}

export function fetchMarketplaceStudios(
  params: MarketplaceCatalogQuery = {},
  auth?: MarketplaceFetchAuth,
) {
  return getPublic<MarketplaceCatalogPage<MarketplaceStudioCard>>(
    `/discover/studios${buildMarketplaceQuery(params, auth)}`,
    catalogInit(auth),
  );
}

export function fetchMarketplaceTrainers(
  params: MarketplaceCatalogQuery = {},
  auth?: MarketplaceFetchAuth,
) {
  return getPublic<MarketplaceCatalogPage<MarketplaceTrainerCard>>(
    `/discover/trainers${buildMarketplaceQuery(params, auth)}`,
    catalogInit(auth),
  );
}

function studentQuery(auth?: MarketplaceFetchAuth) {
  return auth?.studentId
    ? `?studentId=${encodeURIComponent(auth.studentId)}`
    : "";
}

export function fetchMarketplaceClass(
  idOrSlug: string,
  auth?: MarketplaceFetchAuth,
) {
  return getPublic<MarketplaceClassDetail>(
    `/discover/classes/${encodeURIComponent(idOrSlug)}${studentQuery(auth)}`,
    catalogInit(auth),
  );
}

export function fetchMarketplaceTrainer(idOrSlug: string) {
  return getPublic<MarketplaceTrainerDetail>(
    `/discover/trainers/${encodeURIComponent(idOrSlug)}`,
  );
}

export function fetchMarketplaceStudio(
  idOrSlug: string,
  auth?: MarketplaceFetchAuth,
) {
  return getPublic<MarketplaceStudioDetail>(
    `/discover/studios/${encodeURIComponent(idOrSlug)}/page${studentQuery(auth)}`,
    catalogInit(auth),
  );
}

export function marketplaceClassesQueryKey(
  params: MarketplaceCatalogQuery,
  viewerKey = "guest:self",
) {
  return ["marketplace-classes", params, viewerKey] as const;
}

export function marketplaceStudiosQueryKey(
  params: MarketplaceCatalogQuery,
  viewerKey = "guest:self",
) {
  return ["marketplace-studios", params, viewerKey] as const;
}

export function marketplaceTrainersQueryKey(
  params: MarketplaceCatalogQuery,
  viewerKey = "guest:self",
) {
  return ["marketplace-trainers", params, viewerKey] as const;
}

export function marketplaceClassQueryKey(
  idOrSlug: string,
  viewerKey = "guest:self",
) {
  return ["marketplace-class", idOrSlug, viewerKey] as const;
}

export function marketplaceTrainerQueryKey(idOrSlug: string) {
  return ["marketplace-trainer", idOrSlug] as const;
}

export function marketplaceStudioQueryKey(
  idOrSlug: string,
  viewerKey = "guest:self",
) {
  return ["marketplace-studio", idOrSlug, viewerKey] as const;
}
