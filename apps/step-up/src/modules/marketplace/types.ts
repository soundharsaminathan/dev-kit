export const PUBLIC_MARKETPLACE_CATEGORIES = [
  "DANCE",
  "MUSIC",
  "FITNESS",
  "ART",
] as const;

export type PublicMarketplaceCategory =
  (typeof PUBLIC_MARKETPLACE_CATEGORIES)[number];

export const CLASS_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
] as const;

export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const MARKETPLACE_SORTS = [
  "availability",
  "relevance",
  "nearest",
  "earliest",
  "price",
  "rating",
  "popularity",
] as const;

export type MarketplaceSort = (typeof MARKETPLACE_SORTS)[number];

export type MarketplaceCatalogTab = "classes" | "studios" | "trainers";

export type MarketplaceCatalogQuery = {
  category?: PublicMarketplaceCategory | string;
  city?: string;
  q?: string;
  style?: string;
  locality?: string;
  audience?: "KIDS" | "ADULTS";
  level?: ClassLevel;
  days?: "weekday" | "weekend";
  time?: "morning" | "evening";
  lat?: number;
  lng?: number;
  maxKm?: number;
  maxPrice?: number;
  sort?: MarketplaceSort;
  limit?: number;
};

export type MarketplaceRatingView =
  | { visible: true; avg: number; count: number }
  | { visible: false; label: "New"; count: number };

export type MarketplaceEmpty = {
  kind: "category" | "tab" | "filters" | null;
  message: string | null;
};

export type MarketplaceCatalogPage<T> = {
  tab: MarketplaceCatalogTab;
  category: PublicMarketplaceCategory;
  city: string;
  sort: MarketplaceSort;
  empty: MarketplaceEmpty;
  items: T[];
};

export type MarketplaceClassCard = {
  id: string;
  slug: string;
  name: string;
  category: PublicMarketplaceCategory;
  level: ClassLevel | null;
  audience: "KIDS" | "ADULTS" | "BOTH";
  studioId: string;
  studioSlug: string;
  studioName: string;
  trainerId: string | null;
  trainerName: string | null;
  locality: string | null;
  localityId: string | null;
  city: string | null;
  cityId: string | null;
  distanceKm: number | null;
  scheduleLabel: string | null;
  nextSessionAt: string | null;
  availableSeats: number;
  seatLabel: string | null;
  priceFrom: number | null;
  priceCadence: "MONTHLY" | "QUARTERLY" | null;
  coverImageUrl: string | null;
  styles: string[];
  studioRating: MarketplaceRatingView;
  trainerRating: MarketplaceRatingView;
  canTrial: boolean;
  canEnroll: boolean;
  viewerEnrolled: boolean | null;
  viewerTrialBooked: boolean | null;
};

export type MarketplaceStudioCard = {
  id: string;
  slug: string;
  name: string;
  primaryCategory: PublicMarketplaceCategory;
  categories: PublicMarketplaceCategory[];
  locality: string | null;
  localityId: string | null;
  city: string | null;
  cityId: string | null;
  distanceKm: number | null;
  coverImageUrl: string | null;
  rating: MarketplaceRatingView;
  audience: "KIDS" | "ADULTS" | "BOTH" | null;
  priceFrom: number | null;
  priceCadence: "MONTHLY" | "QUARTERLY" | null;
  nextTrialAt: string | null;
  classCount: number;
  styles: string[];
  canTrial: boolean;
  canEnroll: boolean;
  canPrivate: boolean;
  canFloorHire: boolean;
};

export type MarketplaceTrainerCard = {
  id: string;
  slug: string | null;
  name: string;
  categories: PublicMarketplaceCategory[];
  level: ClassLevel | null;
  studioNames: string[];
  locality: string | null;
  city: string | null;
  cityId: string | null;
  distanceKm: number | null;
  nextClassAt: string | null;
  photoUrl: string | null;
  rating: MarketplaceRatingView;
  canTrial: boolean;
  canPrivate: boolean;
};

export type MarketplaceClassDetail = MarketplaceClassCard & {
  branchId: string;
  branchName: string;
  trainers: Array<{ id: string; name: string; photoUrl: string | null }>;
  upcomingSessions: Array<{
    sessionId: string;
    startsAt: string;
    endsAt: string;
  }>;
  canPrivate: boolean;
  canFloorHire: boolean;
};

export type MarketplaceTrainerDetail = MarketplaceTrainerCard & {
  bio: string | null;
  styles: string[];
  studios: Array<{
    id: string;
    slug: string;
    name: string;
    canPrivate: boolean;
  }>;
  classes: Array<{
    id: string;
    slug: string;
    name: string;
    studioName: string;
  }>;
};

export function marketplaceFirstPaint() {
  return {
    city: "chennai",
    category: "DANCE" as const,
    tab: "classes" as const,
    sort: "availability" as const,
  };
}

export function marketplaceSeatCopy(availableSeats: number): string | null {
  if (availableSeats <= 0) return "Full";
  if (availableSeats <= 5) {
    return `${availableSeats} seat${availableSeats === 1 ? "" : "s"} left`;
  }
  return null;
}

export function defaultMarketplaceSort(query?: string | null): MarketplaceSort {
  return query?.trim() ? "relevance" : "availability";
}
