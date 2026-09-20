/** Shared marketplace contract. Public `/` exposes these four categories only. */

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

export const CLASS_AUDIENCES = ["KIDS", "ADULTS", "BOTH"] as const;

export type ClassAudience = (typeof CLASS_AUDIENCES)[number];

export const MARKETPLACE_BOOKING_TYPES = [
  "TRIAL",
  "JOIN",
  "PRIVATE",
  "FLOOR_HIRE",
] as const;

export type MarketplaceBookingType =
  (typeof MARKETPLACE_BOOKING_TYPES)[number];

const DEFAULT_PAINT = {
  city: "chennai",
  category: "DANCE",
  tab: "classes",
} as const;

export function marketplaceFirstPaint() {
  return DEFAULT_PAINT;
}

export function isPublicMarketplaceCategory(
  value: string,
): value is PublicMarketplaceCategory {
  return (PUBLIC_MARKETPLACE_CATEGORIES as readonly string[]).includes(value);
}

export function classAudienceFromBatchCategory(
  category: "KIDS" | "ADULTS",
): ClassAudience {
  return category === "KIDS" ? "KIDS" : "ADULTS";
}

/** Studio feed: hero or branch cover only. Never a batch photo fallback. */
export function hasPublicStudioCover(studio: {
  heroDesktopUrl?: string | null;
  heroMobileUrl?: string | null;
  branchCoverUrl?: string | null;
}): boolean {
  return Boolean(
    studio.heroDesktopUrl || studio.heroMobileUrl || studio.branchCoverUrl,
  );
}

export function hasPublicClassCover(coverImageUrl?: string | null): boolean {
  return Boolean(coverImageUrl?.trim());
}

export function hasPublicTrainerPhoto(photoUrl?: string | null): boolean {
  return Boolean(photoUrl?.trim());
}

export function publicRatingOrNew(count: number, avg: number | null) {
  if (count < 3 || avg == null) {
    return { visible: false as const, label: "New" };
  }
  return { visible: true as const, avg, count };
}

export function batchSlugFromName(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "class"}-${id.slice(0, 8)}`;
}

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

export const PRIVATE_BUFFER_MINUTES = 15;
export const CANCEL_REFUND_HOURS = 12;
export const HOME_SESSION_WINDOW_DAYS = 35;
export const DEFAULT_PRIVATE_MINUTES = 60;
export const DEFAULT_FLOOR_HIRE_MINUTES = 60;
export const SEARCH_TRIGRAM_MIN_CHARS = 3;
export const SEARCH_TRIGRAM_MIN_SIMILARITY = 0.35;
export const PUBLIC_RATING_MIN_COUNT = 3;

export function defaultMarketplaceSort(query?: string | null): MarketplaceSort {
  return query?.trim() ? "relevance" : "availability";
}

export function tokenizeSearch(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function fieldMatchesTokens(field: string, tokens: string[]): boolean {
  const folded = field.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  return tokens.every((token) => folded.includes(token));
}

export function seatCopy(availableSeats: number): string | null {
  if (availableSeats <= 0) return "Full";
  if (availableSeats <= 5) {
    return `${availableSeats} seat${availableSeats === 1 ? "" : "s"} left`;
  }
  return null;
}

export function isJoinBookable(input: {
  availableSeats: number;
  bookingEnrollment: boolean;
  hasPublicPlan: boolean;
}): boolean {
  return (
    input.bookingEnrollment &&
    input.hasPublicPlan &&
    input.availableSeats > 0
  );
}

export function isTrialBookable(input: {
  bookingTrial: boolean;
  hasFutureSession: boolean;
}): boolean {
  return input.bookingTrial && input.hasFutureSession;
}

export function missingPriceSortsLast(priceFrom: number | null): boolean {
  return priceFrom == null;
}

export function marketplaceRatingUniqueKey(input: {
  studentId: string;
  target: "STUDIO" | "TRAINER";
  studioId?: string | null;
  trainerId?: string | null;
  category: PublicMarketplaceCategory;
}): string {
  const targetId =
    input.target === "STUDIO" ? input.studioId : input.trainerId;
  return `${input.studentId}:${input.target}:${targetId ?? ""}:${input.category}`;
}

export function marketplaceRatingStars(value: number): number | null {
  if (!Number.isInteger(value) || value < 1 || value > 5) return null;
  return value;
}

export function marketplacePrivateCompleted(
  status: string,
  endsAt?: Date | null,
  now = new Date(),
): boolean {
  if (status === "COMPLETED") return true;
  return status === "CONFIRMED" && Boolean(endsAt && endsAt.getTime() <= now.getTime());
}

export function marketplaceRatingSourceFromVisit(input: {
  enrolledPresent: boolean;
  trialPresent: boolean;
  privateCompleted: boolean;
}): "CLASS" | "TRIAL" | "PRIVATE" | null {
  if (input.enrolledPresent) return "CLASS";
  if (input.trialPresent) return "TRIAL";
  if (input.privateCompleted) return "PRIVATE";
  return null;
}

export function emptyMarketplaceCopy(input: {
  kind: "category" | "tab" | "filters";
  category: string;
  city: string;
  tab?: string;
}): string {
  const category = input.category;
  const city = input.city;
  if (input.kind === "category") {
    return `${category} classes in ${city} are coming soon.`;
  }
  if (input.kind === "tab") {
    return `No ${input.tab ?? "items"} in ${category} in ${city} yet. Browse classes or studios.`;
  }
  return `No ${input.tab ?? "classes"} match these filters.`;
}

export function canRefundPaidMarketplaceBooking(startsAt: Date, now = new Date()) {
  return startsAt.getTime() - now.getTime() >= CANCEL_REFUND_HOURS * 60 * 60 * 1000;
}

export type BookSheetSource = "class" | "studio" | "trainer" | "studio-detail";

export function childAudienceBlocked(input: {
  forChild: boolean;
  classAudience?: ClassAudience | null;
}): string | null {
  if (!input.classAudience) return null;
  if (input.forChild && input.classAudience === "ADULTS") {
    return "This class is for adults only";
  }
  if (!input.forChild && input.classAudience === "KIDS") {
    return "This class is for kids. Book with a child profile.";
  }
  return null;
}

export function visibleMarketplaceBookTypes(input: {
  canTrial: boolean;
  canEnroll: boolean;
  canPrivate: boolean;
  canFloorHire: boolean;
  source: BookSheetSource;
  viewerEnrolled?: boolean | null;
}): MarketplaceBookingType[] {
  const types: MarketplaceBookingType[] = [];
  if (input.canTrial) types.push("TRIAL");
  if (input.canEnroll && !input.viewerEnrolled) types.push("JOIN");
  if (input.canPrivate) types.push("PRIVATE");
  if (input.canFloorHire && input.source === "studio-detail") {
    types.push("FLOOR_HIRE");
  }
  return types;
}

export function marketplaceBookingNeedsMembership(
  type: string,
  settings: { bookingPrivate?: boolean | null; bookingFloorHire?: boolean | null },
): boolean {
  if (type === "TRIAL") return false;
  if (type === "PRIVATE") return settings.bookingPrivate !== true;
  if (type === "FLOOR_HIRE") return settings.bookingFloorHire !== true;
  return true;
}

export function marketplaceBookingRequiresPayment(
  pricePaise: number | null | undefined,
): boolean {
  return (pricePaise ?? 0) > 0;
}

export function padIntervalEnd(
  endsAt: Date,
  bufferMinutes = PRIVATE_BUFFER_MINUTES,
): Date {
  return new Date(endsAt.getTime() + bufferMinutes * 60 * 1000);
}

export function marketplaceSessionCancelCopy(input: {
  className: string;
  when: string;
  studioName: string;
}): string {
  return `Your trial for ${input.className} on ${input.when} was cancelled by ${input.studioName}. Book another time from the class page.`;
}

export function marketplaceBookingStatusLabel(status: string): string {
  if (status === "AWAITING_PAYMENT") return "Pay to confirm";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "PENDING") return "Waiting for studio";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

function minutesFromClock(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function branchIsOpenAt(
  openingHours: unknown,
  startsAt: Date,
  endsAt: Date,
): boolean {
  if (!openingHours || typeof openingHours !== "object") return true;
  const days = (openingHours as {
    days?: Array<{
      day: number;
      closed?: boolean;
      open?: string;
      close?: string;
    }>;
  }).days;
  if (!days?.length) return true;
  const day = days.find((item) => item.day === startsAt.getDay());
  if (!day) return true;
  if (day.closed) return false;
  if (!day.open || !day.close) return true;
  const startMin = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endMin = endsAt.getHours() * 60 + endsAt.getMinutes();
  return (
    startMin >= minutesFromClock(day.open) &&
    endMin <= minutesFromClock(day.close)
  );
}
