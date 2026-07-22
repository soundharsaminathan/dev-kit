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
  priceMonthly?: number | string | null;
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
  plan?: {
    id: string;
    name: string;
    priceMonthly?: number | string | null;
  } | null;
  danceCategories?: Array<{ name: string; description: string }>;
  sessions?: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
  viewerRating?: number | null;
  viewerEnrolled?: boolean;
  viewerBooking?: {
    id: string;
    type: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    notes?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
  } | null;
};

export function discoverCtaLabel(batch: DiscoverBatch) {
  if (batch.remainingSeats === 0) return "Full";
  if (batch.enrollmentMode === "SELF_JOIN") return "Join";
  return "Book";
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
    priceMonthly: batch.priceMonthly ?? batch.plan?.priceMonthly ?? null,
    durationMinutes: batch.durationMinutes ?? null,
    scheduleLabel: batch.scheduleLabel ?? null,
    trainers: batch.trainers.slice(0, 5).map((entry) => ({
      id: entry.trainer.id,
      name: entry.trainer.name,
      photoUrl: entry.trainer.photoUrl ?? null,
    })),
  };
}
