import { getPublic } from "@/lib/api";
import type {
  DiscoverCategory,
  DiscoverCity,
  DiscoverStats,
  DiscoverStudioCard,
  DiscoverStudioDetail,
  DiscoverStudiosQuery,
} from "./types";

function buildQuery(params: DiscoverStudiosQuery): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.city) search.set("city", params.city);
  if (params.category) search.set("category", params.category);
  if (params.audience) search.set("audience", params.audience);
  if (params.days) search.set("days", params.days);
  if (params.time) search.set("time", params.time);
  if (params.lat != null) search.set("lat", String(params.lat));
  if (params.lng != null) search.set("lng", String(params.lng));
  if (params.maxKm != null) search.set("maxKm", String(params.maxKm));
  if (params.maxPrice != null) search.set("maxPrice", String(params.maxPrice));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function fetchDiscoverStudios(params: DiscoverStudiosQuery = {}) {
  return getPublic<DiscoverStudioCard[]>(
    `/discover/studios${buildQuery(params)}`,
  );
}

export function fetchDiscoverStudio(id: string) {
  return getPublic<DiscoverStudioDetail>(
    `/discover/studios/${encodeURIComponent(id)}`,
  );
}

export function fetchDiscoverCities() {
  return getPublic<DiscoverCity[]>("/discover/cities");
}

export function fetchDiscoverCategories() {
  return getPublic<DiscoverCategory[]>("/discover/categories");
}

export function fetchDiscoverStats() {
  return getPublic<DiscoverStats>("/discover/stats");
}

export function discoverStudiosQueryKey(params: DiscoverStudiosQuery) {
  return ["discover-studios", params] as const;
}
