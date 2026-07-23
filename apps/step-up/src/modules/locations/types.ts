export type BranchMediaKind = "IMAGE" | "VIDEO";

export type BranchMediaCategory =
  | "STUDIO"
  | "RECEPTION"
  | "PRACTICE_HALL"
  | "EVENTS"
  | "FACILITIES"
  | "OTHER";

export type BranchMedia = {
  id: string;
  kind: BranchMediaKind;
  category: BranchMediaCategory;
  objectKey: string;
  url: string;
  caption: string | null;
  altText: string | null;
  sortOrder: number;
  metadata?: unknown;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BranchFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type BranchTestimonial = {
  id: string;
  quote: string;
  authorName: string;
  rating: number | null;
  sortOrder: number;
};

export type OpeningHoursDay = {
  day: number;
  closed?: boolean;
  open?: string;
  close?: string;
};

export type OpeningHours = {
  timezone?: string;
  days?: OpeningHoursDay[];
  notes?: string;
};

export type StudioBranch = {
  id: string;
  studioId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  coverMediaId: string | null;
  coverMedia: BranchMedia | null;
  amenities: string[];
  openingHours: OpeningHours | null;
  pricingBlurb: string | null;
  media?: BranchMedia[];
  faqs?: BranchFaq[];
  testimonials?: BranchTestimonial[];
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    batches: number;
  };
};

export type BranchLandingBatch = {
  id: string;
  name: string;
  category: string;
  scheduleJson: unknown;
  coverImageUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  capacity: number;
  enrollmentCount: number;
};

export type BranchLandingSubscription = {
  id: string;
  name: string;
  kind: string;
  individualAudience?: string | null;
  familyPack?: string | null;
  billingCadence: string;
  adultSeats: number;
  kidSeats: number;
  price: number | string;
  active: boolean;
};

export type BranchLandingTrainer = {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  styles: string[];
};

export type BranchLanding = StudioBranch & {
  ratingAvg: number | null;
  ratingCount: number;
  batches: BranchLandingBatch[];
  subscriptions?: BranchLandingSubscription[];
  trainers: BranchLandingTrainer[];
};

export type SignedUploadResponse = {
  uploadUrl: string;
  publicUrl: string;
  key?: string;
  contentType: string;
  headers: Record<string, string>;
};

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export const MEDIA_CATEGORY_LABELS: Record<BranchMediaCategory, string> = {
  STUDIO: "Studio",
  RECEPTION: "Reception",
  PRACTICE_HALL: "Practice hall",
  EVENTS: "Events",
  FACILITIES: "Facilities",
  OTHER: "Other",
};

export const AMENITY_OPTIONS = [
  { id: "parking", label: "Parking" },
  { id: "ac", label: "Air conditioning" },
  { id: "lockers", label: "Lockers" },
  { id: "showers", label: "Showers" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "water", label: "Drinking water" },
  { id: "changing_rooms", label: "Changing rooms" },
  { id: "waiting_area", label: "Waiting area" },
] as const;

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function coverUrl(branch: Pick<StudioBranch, "coverMedia" | "media">) {
  return (
    branch.coverMedia?.url ??
    branch.media?.find((item) => item.kind === "IMAGE")?.url ??
    branch.media?.[0]?.url ??
    null
  );
}

export function mapsUrl(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}
