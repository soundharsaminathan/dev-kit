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
};

export type DiscoverCategory = {
  id: DiscoverCategoryId;
  label: string;
  studioCount: number;
};

export type DiscoverStats = {
  studios: number;
  classes: number;
  learners: number;
};

export type DiscoverStudiosQuery = {
  q?: string;
  city?: string;
  category?: string;
  audience?: "KIDS" | "ADULTS";
  days?: "weekday" | "weekend";
  time?: "morning" | "evening";
  lat?: number;
  lng?: number;
  maxKm?: number;
  maxPrice?: number;
  limit?: number;
};

export const CATEGORY_META: Array<{
  id: DiscoverCategoryId;
  label: string;
  image: string;
}> = [
  { id: "dance", label: "Dance", image: "/marketing/student/cat-dance.svg" },
  { id: "music", label: "Music", image: "/marketing/student/cat-music.svg" },
  { id: "art", label: "Art", image: "/marketing/student/cat-art.svg" },
  {
    id: "fitness",
    label: "Fitness",
    image: "/marketing/student/cat-fitness.svg",
  },
  {
    id: "swimming",
    label: "Swimming",
    image: "/marketing/student/cat-swimming.svg",
  },
  {
    id: "martial-arts",
    label: "Martial arts",
    image: "/marketing/student/cat-martial.svg",
  },
  {
    id: "theatre",
    label: "Theatre",
    image: "/marketing/student/cat-theatre.svg",
  },
  {
    id: "other",
    label: "Other classes",
    image: "/marketing/student/cat-other.svg",
  },
];

export const LAUNCH_CITY_IDS = [
  "chennai",
  "bengaluru",
  "hyderabad",
  "mumbai",
  "delhi",
  "coimbatore",
] as const;
