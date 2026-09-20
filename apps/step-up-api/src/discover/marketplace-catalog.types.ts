import type { BillingCadence } from "../generated/prisma/client";
import type {
  ClassAudience,
  ClassLevel,
  MarketplaceSort,
  PublicMarketplaceCategory,
} from "./marketplace.contract";

export type MarketplaceCatalogTab = "classes" | "studios" | "trainers";

export type MarketplaceCatalogFilters = {
  category: PublicMarketplaceCategory;
  city: string;
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

export type MarketplaceClassCard = {
  id: string;
  slug: string;
  name: string;
  category: PublicMarketplaceCategory;
  level: ClassLevel | null;
  audience: ClassAudience;
  studioId: string;
  studioSlug: string;
  studioName: string;
  trainerId: string | null;
  trainerSlug: string | null;
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
  priceCadence: BillingCadence | null;
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
  audience: ClassAudience | null;
  priceFrom: number | null;
  priceCadence: BillingCadence | null;
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

export type MarketplaceClassPlan = {
  name: string;
  price: number;
  cadence: BillingCadence;
};

export type MarketplaceClassDetail = MarketplaceClassCard & {
  studioSlug: string;
  branchId: string;
  branchName: string;
  trainers: Array<{
    id: string;
    slug: string;
    name: string;
    photoUrl: string | null;
  }>;
  upcomingSessions: Array<{
    sessionId: string;
    startsAt: string;
    endsAt: string;
  }>;
  plans: MarketplaceClassPlan[];
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
    studioSlug: string;
    studioName: string;
  }>;
};

export type MarketplaceStudioBranch = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  openingHours: unknown;
  mapsUrl: string | null;
};

export type MarketplaceStudioDetail = MarketplaceStudioCard & {
  about: string | null;
  tagline: string | null;
  address: string | null;
  photos: string[];
  branches: MarketplaceStudioBranch[];
  classes: MarketplaceClassCard[];
  trainers: MarketplaceTrainerCard[];
};
