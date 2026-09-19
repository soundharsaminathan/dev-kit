/** Shared public discover types (mirrors API DTOs). */

export type DiscoverCategoryId =
  | "dance"
  | "music"
  | "art"
  | "fitness"
  | "swimming"
  | "martial-arts"
  | "theatre"
  | "other";

export type DiscoverStudioCard = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  cityId: string | null;
  locality: string | null;
  localityId: string | null;
  styles: string[];
  categories: DiscoverCategoryId[];
  imageUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  distanceKm: number | null;
  batchCount: number;
  timingLabel: string | null;
  priceFrom: number | null;
  priceCadence: "MONTHLY" | "QUARTERLY" | null;
};

export type DiscoverBatchSummary = {
  id: string;
  name: string;
  category: "KIDS" | "ADULTS";
  styles: string[];
  scheduleLabel: string | null;
  timingLabel: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  priceFrom: number | null;
  priceCadence: "MONTHLY" | "QUARTERLY" | null;
};

export type DiscoverStudioDetail = DiscoverStudioCard & {
  address: string | null;
  contact: string | null;
  logoUrl: string | null;
  heroDesktopUrl: string | null;
  heroMobileUrl: string | null;
  batches: DiscoverBatchSummary[];
};

export type DiscoverCity = {
  id: string;
  label: string;
  studioCount: number;
  available?: boolean;
};

export type DiscoverStyleFacet = {
  id: string;
  label: string;
  studioCount: number;
};

export type DiscoverAreaFacet = {
  id: string;
  label: string;
  studioCount: number;
  popular: boolean;
};

export type DiscoverLanding = {
  city: {
    id: string;
    label: string;
    available: boolean;
  };
  cities: DiscoverCity[];
  styles: DiscoverStyleFacet[];
  areas: DiscoverAreaFacet[];
  studios: DiscoverStudioCard[];
};

export type DiscoverTrialSlot = {
  sessionId: string;
  batchId: string;
  batchName: string;
  audience: "KIDS" | "ADULTS";
  styleBadge: string | null;
  startsAt: string;
  endsAt: string;
};

export type DiscoverStudiosQuery = {
  q?: string;
  city?: string;
  category?: string;
  style?: string;
  locality?: string;
  audience?: "KIDS" | "ADULTS";
  days?: "weekday" | "weekend";
  time?: "morning" | "evening";
  lat?: number;
  lng?: number;
  maxKm?: number;
  maxPrice?: number;
  limit?: number;
};

export const DEFAULT_CITY_ID = "chennai";
export const LIVE_CITY_IDS = ["chennai"] as const;

export const LAUNCH_CITY_IDS = [
  "chennai",
  "bengaluru",
  "hyderabad",
  "mumbai",
  "delhi",
  "coimbatore",
] as const;

export function isLiveCity(id: string) {
  return (LIVE_CITY_IDS as readonly string[]).includes(id.trim().toLowerCase());
}
