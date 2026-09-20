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

export type DiscoverBatchTrainer = {
  id: string;
  name: string;
  photoUrl: string | null;
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
  coverImageUrl?: string | null;
  trainers?: DiscoverBatchTrainer[];
};

export type DiscoverTrainer = {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  styles: string[];
  instagramUrl: string | null;
};

export type DiscoverGalleryItem = {
  url: string;
  caption: string | null;
};

export type DiscoverBranchVisit = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  openingHours: unknown;
  pricingBlurb: string | null;
  description: string | null;
  coverUrl: string | null;
};

export type DiscoverFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type DiscoverTestimonial = {
  id: string;
  quote: string;
  authorName: string;
  rating: number | null;
  sortOrder: number;
};

export type DiscoverStudioDetail = DiscoverStudioCard & {
  address: string | null;
  contact: string | null;
  logoUrl: string | null;
  heroDesktopUrl: string | null;
  heroMobileUrl: string | null;
  tagline?: string | null;
  about?: string | null;
  foundedYear?: number | null;
  email?: string | null;
  whatsapp?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  websiteUrl?: string | null;
  whatToBring?: string | null;
  trialBlurb?: string | null;
  photos?: string[];
  trainers?: DiscoverTrainer[];
  branches?: DiscoverBranchVisit[];
  gallery?: DiscoverGalleryItem[];
  faqs?: DiscoverFaq[];
  testimonials?: DiscoverTestimonial[];
  batches: DiscoverBatchSummary[];
  nextTrialSlot?: DiscoverTrialSlot | null;
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
  classAudience?: "KIDS" | "ADULTS" | "BOTH";
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
