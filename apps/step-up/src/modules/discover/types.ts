export type DiscoverBatchPlan = {
  id: string;
  name: string;
  kind: "INDIVIDUAL" | "FAMILY";
  individualAudience?: "ADULT" | "KID" | null;
  familyPack?: string | null;
  billingCadence: "MONTHLY" | "QUARTERLY";
  adultSeats: number;
  kidSeats: number;
  price: number | string;
  active: boolean;
};

export type DiscoverBatch = {
  id: string;
  name: string;
  enrollmentMode: "STAFF_ONLY" | "SELF_JOIN";
  category: "KIDS" | "ADULTS" | string;
  coverImageUrl?: string | null;
  styleBadge?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  remainingSeats?: number | null;
  capacity: number;
  price?: number | string | null;
  plans?: DiscoverBatchPlan[];
  durationMinutes?: number | null;
  scheduleLabel?: string | null;
  active: boolean;
  trainers: Array<{
    trainer: {
      id: string;
      name: string;
      photoUrl?: string | null;
    };
  }>;
  branch?: {
    id: string;
    name: string;
    address?: string | null;
    photos?: string[];
  } | null;
  danceCategories?: Array<{ name: string; description: string }>;
  sessions?: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
  viewerRating?: number | null;
  viewerEnrolled?: boolean;
  viewerEnrollment?: {
    enrolledAt: string;
  } | null;
  viewerBooking?: {
    id: string;
    type: string;
    status:
      | "AWAITING_PAYMENT"
      | "PENDING"
      | "CONFIRMED"
      | "CANCELLED"
      | "COMPLETED";
    notes?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    paymentHoldExpiresAt?: string | null;
  } | null;
};

const MUTED_DISCOVER_CTAS = new Set([
  "Enrolled",
  "Trial requested",
  "Trial approved",
  "Request pending",
  "Booking confirmed",
  "Full",
]);

export function discoverCtaLabel(batch: DiscoverBatch) {
  if (batch.viewerEnrolled) {
    return "Enrolled";
  }

  const booking = batch.viewerBooking;
  if (booking) {
    const isTrial = booking.type === "TRIAL";
    if (booking.status === "AWAITING_PAYMENT") return "Pay now";
    if (booking.status === "PENDING") {
      return isTrial ? "Trial requested" : "Request pending";
    }
    if (booking.status === "CONFIRMED") {
      return isTrial ? "Trial approved" : "Booking confirmed";
    }
  }

  if (batch.remainingSeats === 0) return "Full";
  if ((batch.plans?.length ?? 0) > 0) return "Enroll";
  if (batch.enrollmentMode === "SELF_JOIN") return "Join";
  return "Book";
}

export function isDiscoverCtaMuted(label: string) {
  return MUTED_DISCOVER_CTAS.has(label);
}

export function toBatchCardData(batch: DiscoverBatch) {
  return {
    id: batch.id,
    name: batch.name,
    coverImageUrl: batch.coverImageUrl ?? null,
    styleBadge: batch.styleBadge ?? null,
    category: batch.category,
    ratingAvg: batch.ratingAvg ?? null,
    ratingCount: batch.ratingCount ?? null,
    remainingSeats: batch.remainingSeats ?? null,
    capacity: batch.capacity,
    price: batch.price ?? null,
    durationMinutes: batch.durationMinutes ?? null,
    scheduleLabel: batch.scheduleLabel ?? null,
    branchName: batch.branch?.name ?? null,
    active: batch.active,
    enrollmentMode: batch.enrollmentMode,
    trainers: batch.trainers.slice(0, 5).map((entry) => ({
      id: entry.trainer.id,
      name: entry.trainer.name,
      photoUrl: entry.trainer.photoUrl ?? null,
    })),
  };
}
