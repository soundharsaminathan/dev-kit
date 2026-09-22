import { describe, expect, it } from "vitest";
import {
  freelanceTrainerAttachError,
  marketplaceMissingMediaAlert,
  STUDIO_MARKETPLACE_TOGGLES,
  studioMarketplaceTogglesFrom,
} from "./controls";

describe("marketplace studio controls", () => {
  it("exposes the eight locked toggles", () => {
    expect(STUDIO_MARKETPLACE_TOGGLES.map((item) => item.key)).toEqual([
      "publicStudioListing",
      "publicClasses",
      "publicTrainers",
      "publicRatings",
      "bookingTrial",
      "bookingEnrollment",
      "bookingPrivate",
      "bookingFloorHire",
    ]);
    expect(studioMarketplaceTogglesFrom(null).publicTrainers).toBe(true);
    expect(studioMarketplaceTogglesFrom(null).bookingFloorHire).toBe(false);
  });

  it("alerts missing media per object", () => {
    expect(
      marketplaceMissingMediaAlert({
        kind: "CLASS",
        objectId: "c1",
        objectName: "Hip Hop",
        coverImageUrl: null,
      })?.message,
    ).toBe("Add a cover photo so this class can appear on classa.");
    expect(
      marketplaceMissingMediaAlert({
        kind: "STUDIO",
        objectId: "s1",
        objectName: "Rhythm",
        heroDesktopUrl: "hero.jpg",
      }),
    ).toBeNull();
  });

  it("refuses freelance attach without availability", () => {
    expect(
      freelanceTrainerAttachError({
        role: "TRAINER",
        active: true,
        alreadyLinked: false,
        homeStudio: false,
        hasAvailability: false,
      }),
    ).toBe("Trainer has no published availability");
  });
});
