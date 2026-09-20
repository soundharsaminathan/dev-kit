export const STUDIO_MARKETPLACE_TOGGLES = [
  {
    key: "publicStudioListing",
    group: "visibility",
    label: "Studio listing",
    description: "Show this studio on classa. Off hides the listing.",
  },
  {
    key: "publicClasses",
    group: "visibility",
    label: "Classes",
    description: "Show this studio’s classes on classa.",
  },
  {
    key: "publicTrainers",
    group: "visibility",
    label: "Trainers",
    description: "Show trainers who teach here. Off hides those cards.",
  },
  {
    key: "publicRatings",
    group: "visibility",
    label: "Ratings",
    description: "Show public stars after three ratings.",
  },
  {
    key: "bookingTrial",
    group: "booking",
    label: "Trial",
    description: "Let students request a trial class.",
  },
  {
    key: "bookingEnrollment",
    group: "booking",
    label: "Enrollment",
    description: "Let students join a class from classa.",
  },
  {
    key: "bookingPrivate",
    group: "booking",
    label: "Private",
    description: "Let students book a trainer and a floor.",
  },
  {
    key: "bookingFloorHire",
    group: "booking",
    label: "Floor hire",
    description: "Show floor hire on the studio page only.",
  },
] as const;

export type StudioMarketplaceToggleKey =
  (typeof STUDIO_MARKETPLACE_TOGGLES)[number]["key"];

export type StudioMarketplaceToggles = {
  [K in StudioMarketplaceToggleKey]: boolean;
};

export const DEFAULT_STUDIO_MARKETPLACE_TOGGLES: StudioMarketplaceToggles = {
  publicStudioListing: true,
  publicClasses: true,
  publicTrainers: true,
  publicRatings: true,
  bookingTrial: true,
  bookingEnrollment: true,
  bookingPrivate: false,
  bookingFloorHire: false,
};

export function studioMarketplaceTogglesFrom(
  settings?: Partial<StudioMarketplaceToggles> | null,
): StudioMarketplaceToggles {
  return {
    publicStudioListing:
      settings?.publicStudioListing ??
      DEFAULT_STUDIO_MARKETPLACE_TOGGLES.publicStudioListing,
    publicClasses:
      settings?.publicClasses ?? DEFAULT_STUDIO_MARKETPLACE_TOGGLES.publicClasses,
    publicTrainers:
      settings?.publicTrainers ??
      DEFAULT_STUDIO_MARKETPLACE_TOGGLES.publicTrainers,
    publicRatings:
      settings?.publicRatings ?? DEFAULT_STUDIO_MARKETPLACE_TOGGLES.publicRatings,
    bookingTrial:
      settings?.bookingTrial ?? DEFAULT_STUDIO_MARKETPLACE_TOGGLES.bookingTrial,
    bookingEnrollment:
      settings?.bookingEnrollment ??
      DEFAULT_STUDIO_MARKETPLACE_TOGGLES.bookingEnrollment,
    bookingPrivate:
      settings?.bookingPrivate ??
      DEFAULT_STUDIO_MARKETPLACE_TOGGLES.bookingPrivate,
    bookingFloorHire:
      settings?.bookingFloorHire ??
      DEFAULT_STUDIO_MARKETPLACE_TOGGLES.bookingFloorHire,
  };
}

export type MarketplaceMediaKind = "CLASS" | "STUDIO" | "TRAINER";

export type MarketplaceMediaAlert = {
  kind: MarketplaceMediaKind;
  objectId: string;
  objectName: string;
  message: string;
  href?: string;
};

export function marketplaceMissingMediaMessage(
  kind: MarketplaceMediaKind,
): string {
  if (kind === "CLASS") {
    return "Add a cover photo so this class can appear on classa.";
  }
  if (kind === "STUDIO") {
    return "Add a cover photo so this studio can appear on classa.";
  }
  return "Add a photo so this trainer can appear on classa.";
}

export function marketplaceMissingMediaAlert(input: {
  kind: MarketplaceMediaKind;
  objectId: string;
  objectName: string;
  coverImageUrl?: string | null | undefined;
  heroDesktopUrl?: string | null | undefined;
  heroMobileUrl?: string | null | undefined;
  branchCoverUrl?: string | null | undefined;
  photoUrl?: string | null | undefined;
}): MarketplaceMediaAlert | null {
  const missing =
    input.kind === "CLASS"
      ? !input.coverImageUrl?.trim()
      : input.kind === "STUDIO"
        ? !(
            input.heroDesktopUrl ||
            input.heroMobileUrl ||
            input.branchCoverUrl
          )
        : !input.photoUrl?.trim();
  if (!missing) return null;
  return {
    kind: input.kind,
    objectId: input.objectId,
    objectName: input.objectName,
    message: marketplaceMissingMediaMessage(input.kind),
  };
}

export function freelanceTrainerAttachError(input: {
  role: string;
  active: boolean;
  alreadyLinked: boolean;
  homeStudio: boolean;
  hasAvailability: boolean;
}): string | null {
  if (input.role !== "TRAINER") return "Only trainers can be attached";
  if (!input.active) return "Trainer is inactive";
  if (input.alreadyLinked) return "Trainer is already attached";
  if (input.homeStudio) return "Trainer already belongs to this studio";
  if (!input.hasAvailability) return "Trainer has no published availability";
  return null;
}

export function weekdayLabel(weekday: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday] ?? "";
}
