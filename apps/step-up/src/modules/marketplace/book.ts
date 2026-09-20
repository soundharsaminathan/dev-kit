export type BookSheetSource = "class" | "studio" | "trainer" | "studio-detail";

export type MarketplaceBookType = "TRIAL" | "JOIN" | "PRIVATE" | "FLOOR_HIRE";

export type BookSheetTarget = {
  source: BookSheetSource;
  studioId: string;
  studioName: string;
  studioSlug?: string | null;
  batchId?: string | null;
  classSlug?: string | null;
  className?: string | null;
  audience?: "KIDS" | "ADULTS" | "BOTH" | null;
  trainerId?: string | null;
  trainerName?: string | null;
  canTrial?: boolean;
  canEnroll?: boolean;
  canPrivate?: boolean;
  canFloorHire?: boolean;
  viewerEnrolled?: boolean | null;
};

export function childAudienceBlocked(input: {
  forChild: boolean;
  classAudience?: "KIDS" | "ADULTS" | "BOTH" | null;
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
}): MarketplaceBookType[] {
  const types: MarketplaceBookType[] = [];
  if (input.canTrial) types.push("TRIAL");
  if (input.canEnroll && !input.viewerEnrolled) types.push("JOIN");
  if (input.canPrivate) types.push("PRIVATE");
  if (input.canFloorHire && input.source === "studio-detail") {
    types.push("FLOOR_HIRE");
  }
  return types;
}

export function marketplaceBookingStatusLabel(status: string): string {
  if (status === "AWAITING_PAYMENT") return "Pay to confirm";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "PENDING") return "Waiting for studio";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

export function bookTypeLabel(type: MarketplaceBookType): string {
  if (type === "TRIAL") return "Trial";
  if (type === "JOIN") return "Join class";
  if (type === "PRIVATE") return "Private";
  return "Floor hire";
}

export function bookTypeHint(type: MarketplaceBookType): string {
  if (type === "TRIAL") return "Try an upcoming class session";
  if (type === "JOIN") return "Enroll in this class";
  if (type === "PRIVATE") return "Book a trainer and a floor";
  return "Hire the room only";
}

export function formatExactPaise(paise: number | null | undefined): string | null {
  if (paise == null || paise <= 0) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function formatBookWhen(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
