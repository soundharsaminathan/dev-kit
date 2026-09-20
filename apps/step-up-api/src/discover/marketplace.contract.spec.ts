import { describe, expect, it } from "vitest";
import {
  batchSlugFromName,
  branchIsOpenAt,
  canRefundPaidMarketplaceBooking,
  childAudienceBlocked,
  classAudienceFromBatchCategory,
  defaultMarketplaceSort,
  emptyMarketplaceCopy,
  fieldMatchesTokens,
  hasPublicClassCover,
  hasPublicStudioCover,
  hasPublicTrainerPhoto,
  isJoinBookable,
  isPublicMarketplaceCategory,
  marketplaceBookingNeedsMembership,
  marketplaceBookingRequiresPayment,
  marketplaceFirstPaint,
  marketplacePrivateCompleted,
  marketplaceRatingSourceFromVisit,
  marketplaceRatingStars,
  marketplaceRatingUniqueKey,
  marketplaceSessionCancelCopy,
  marketplaceMissingMediaAlert,
  freelanceTrainerAttachError,
  STUDIO_MARKETPLACE_TOGGLES,
  studioMarketplaceTogglesFrom,
  PUBLIC_MARKETPLACE_CATEGORIES,
  publicRatingOrNew,
  seatCopy,
  tokenizeSearch,
  visibleMarketplaceBookTypes,
} from "./marketplace.contract";

describe("marketplace contract", () => {
  it("exposes only four public categories", () => {
    expect(PUBLIC_MARKETPLACE_CATEGORIES).toEqual([
      "DANCE",
      "MUSIC",
      "FITNESS",
      "ART",
    ]);
    expect(isPublicMarketplaceCategory("SWIMMING")).toBe(false);
    expect(isPublicMarketplaceCategory("DANCE")).toBe(true);
  });

  it("defaults first paint to Chennai dance classes", () => {
    expect(marketplaceFirstPaint()).toEqual({
      city: "chennai",
      category: "DANCE",
      tab: "classes",
    });
  });

  it("maps existing batch audience without inventing BOTH", () => {
    expect(classAudienceFromBatchCategory("KIDS")).toBe("KIDS");
    expect(classAudienceFromBatchCategory("ADULTS")).toBe("ADULTS");
  });

  it("hides studio cards without a real cover", () => {
    expect(hasPublicStudioCover({})).toBe(false);
    expect(hasPublicStudioCover({ heroDesktopUrl: "hero.jpg" })).toBe(true);
    expect(hasPublicStudioCover({ branchCoverUrl: "branch.jpg" })).toBe(true);
  });

  it("hides a class or trainer without hiding the studio", () => {
    expect(hasPublicClassCover(null)).toBe(false);
    expect(hasPublicClassCover("cover.jpg")).toBe(true);
    expect(hasPublicTrainerPhoto("")).toBe(false);
    expect(hasPublicTrainerPhoto("face.jpg")).toBe(true);
  });

  it("keeps stars hidden until three ratings", () => {
    expect(publicRatingOrNew(1, 5)).toEqual({
      visible: false,
      label: "New",
    });
    expect(publicRatingOrNew(3, 4.8)).toEqual({
      visible: true,
      avg: 4.8,
      count: 3,
    });
  });

  it("builds unique class slugs from name and id", () => {
    expect(batchSlugFromName("Hip Hop — Beginners", "abcdefghij")).toBe(
      "hip-hop-beginners-abcdefgh",
    );
  });

  it("defaults sort to availability unless searching", () => {
    expect(defaultMarketplaceSort(null)).toBe("availability");
    expect(defaultMarketplaceSort("hip hop")).toBe("relevance");
  });

  it("requires every search token to match", () => {
    const tokens = tokenizeSearch("Hip-hop Adyar");
    expect(tokens).toEqual(["hip", "hop", "adyar"]);
    expect(fieldMatchesTokens("Hip Hop at Rhythm Adyar", tokens)).toBe(true);
    expect(fieldMatchesTokens("Hip Hop Mylapore", tokens)).toBe(false);
  });

  it("shows exact seat counts only when 1 to 5 remain", () => {
    expect(seatCopy(0)).toBe("Full");
    expect(seatCopy(1)).toBe("1 seat left");
    expect(seatCopy(3)).toBe("3 seats left");
    expect(seatCopy(8)).toBeNull();
  });

  it("blocks join when the class is full", () => {
    expect(
      isJoinBookable({
        availableSeats: 0,
        bookingEnrollment: true,
        hasPublicPlan: true,
      }),
    ).toBe(false);
  });

  it("keeps studio and trainer ratings unique per category", () => {
    const dance = marketplaceRatingUniqueKey({
      studentId: "s1",
      target: "TRAINER",
      trainerId: "t1",
      category: "DANCE",
    });
    const fitness = marketplaceRatingUniqueKey({
      studentId: "s1",
      target: "TRAINER",
      trainerId: "t1",
      category: "FITNESS",
    });
    expect(dance).not.toBe(fitness);
    expect(
      marketplaceRatingUniqueKey({
        studentId: "s1",
        target: "STUDIO",
        studioId: "st1",
        category: "DANCE",
      }),
    ).toBe("s1:STUDIO:st1:DANCE");
  });

  it("accepts only 1–5 star ratings", () => {
    expect(marketplaceRatingStars(5)).toBe(5);
    expect(marketplaceRatingStars(0)).toBeNull();
    expect(marketplaceRatingStars(4.5)).toBeNull();
  });

  it("treats ended confirmed privates as completed", () => {
    const ended = new Date("2026-09-19T10:00:00.000Z");
    const now = new Date("2026-09-20T10:00:00.000Z");
    expect(marketplacePrivateCompleted("COMPLETED")).toBe(true);
    expect(marketplacePrivateCompleted("CONFIRMED", ended, now)).toBe(true);
    expect(marketplacePrivateCompleted("CONFIRMED", now, ended)).toBe(false);
    expect(marketplacePrivateCompleted("PENDING", ended, now)).toBe(false);
  });

  it("prefers class present over trial for rating source", () => {
    expect(
      marketplaceRatingSourceFromVisit({
        enrolledPresent: true,
        trialPresent: true,
        privateCompleted: true,
      }),
    ).toBe("CLASS");
    expect(
      marketplaceRatingSourceFromVisit({
        enrolledPresent: false,
        trialPresent: true,
        privateCompleted: true,
      }),
    ).toBe("TRIAL");
    expect(
      marketplaceRatingSourceFromVisit({
        enrolledPresent: false,
        trialPresent: false,
        privateCompleted: false,
      }),
    ).toBeNull();
  });

  it("refunds paid private or floor hire only 12 hours before start", () => {
    const start = new Date("2026-09-21T12:00:00.000Z");
    expect(
      canRefundPaidMarketplaceBooking(start, new Date("2026-09-20T12:00:00.000Z")),
    ).toBe(true);
    expect(
      canRefundPaidMarketplaceBooking(start, new Date("2026-09-21T11:00:00.000Z")),
    ).toBe(false);
  });

  it("uses specific empty copy instead of a generic miss", () => {
    expect(
      emptyMarketplaceCopy({
        kind: "category",
        category: "Dance",
        city: "Chennai",
      }),
    ).toBe("Dance classes in Chennai are coming soon.");
  });
});

describe("marketplace book contract", () => {
  it("blocks child × audience mismatches with the locked copy", () => {
    expect(
      childAudienceBlocked({ forChild: true, classAudience: "ADULTS" }),
    ).toBe("This class is for adults only");
    expect(
      childAudienceBlocked({ forChild: false, classAudience: "KIDS" }),
    ).toBe("This class is for kids. Book with a child profile.");
    expect(
      childAudienceBlocked({ forChild: true, classAudience: "KIDS" }),
    ).toBeNull();
    expect(
      childAudienceBlocked({ forChild: true, classAudience: "BOTH" }),
    ).toBeNull();
    expect(
      childAudienceBlocked({ forChild: false, classAudience: "ADULTS" }),
    ).toBeNull();
    expect(
      childAudienceBlocked({ forChild: false, classAudience: "BOTH" }),
    ).toBeNull();
  });

  it("omits floor hire unless the sheet opened from studio detail", () => {
    const flags = {
      canTrial: true,
      canEnroll: true,
      canPrivate: true,
      canFloorHire: true,
    };
    expect(
      visibleMarketplaceBookTypes({ ...flags, source: "studio" }),
    ).toEqual(["TRIAL", "JOIN", "PRIVATE"]);
    expect(
      visibleMarketplaceBookTypes({ ...flags, source: "studio-detail" }),
    ).toEqual(["TRIAL", "JOIN", "PRIVATE", "FLOOR_HIRE"]);
    expect(
      visibleMarketplaceBookTypes({
        ...flags,
        source: "class",
        viewerEnrolled: true,
      }),
    ).toEqual(["TRIAL", "PRIVATE"]);
  });

  it("skips membership for public private and floor hire only", () => {
    expect(marketplaceBookingNeedsMembership("TRIAL", {})).toBe(false);
    expect(
      marketplaceBookingNeedsMembership("PRIVATE", { bookingPrivate: true }),
    ).toBe(false);
    expect(
      marketplaceBookingNeedsMembership("PRIVATE", { bookingPrivate: false }),
    ).toBe(true);
    expect(
      marketplaceBookingNeedsMembership("FLOOR_HIRE", {
        bookingFloorHire: false,
      }),
    ).toBe(true);
    expect(
      marketplaceBookingNeedsMembership("FLOOR_HIRE", {
        bookingFloorHire: true,
      }),
    ).toBe(false);
    expect(
      marketplaceBookingNeedsMembership("OPEN_SEAT", {
        bookingPrivate: true,
        bookingFloorHire: true,
      }),
    ).toBe(true);
  });

  it("requires payment only when a private or floor price is set", () => {
    expect(marketplaceBookingRequiresPayment(null)).toBe(false);
    expect(marketplaceBookingRequiresPayment(0)).toBe(false);
    expect(marketplaceBookingRequiresPayment(150000)).toBe(true);
  });

  it("uses the locked session-cancel trial copy", () => {
    expect(
      marketplaceSessionCancelCopy({
        className: "Adults Advance",
        when: "Mon, 21 Sep · 7:00 PM – 8:00 PM",
        studioName: "E-Grade",
      }),
    ).toBe(
      "Your trial for Adults Advance on Mon, 21 Sep · 7:00 PM – 8:00 PM was cancelled by E-Grade. Book another time from the class page.",
    );
  });

  it("treats a closed branch day as not bookable", () => {
    const sunday = new Date("2026-09-20T10:00:00");
    const monday = new Date("2026-09-21T10:00:00");
    const hours = {
      days: [
        { day: 0, closed: true },
        { day: 1, open: "09:00", close: "18:00" },
      ],
    };
    expect(branchIsOpenAt(hours, sunday, new Date("2026-09-20T11:00:00"))).toBe(
      false,
    );
    expect(branchIsOpenAt(hours, monday, new Date("2026-09-21T11:00:00"))).toBe(
      true,
    );
    expect(branchIsOpenAt(hours, monday, new Date("2026-09-21T19:00:00"))).toBe(
      false,
    );
  });
});

describe("marketplace studio controls", () => {
  it("locks the eight visibility and booking toggles", () => {
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
    expect(studioMarketplaceTogglesFrom(null).bookingFloorHire).toBe(false);
    expect(studioMarketplaceTogglesFrom(null).publicTrainers).toBe(true);
  });

  it("alerts missing media per object instead of a whole-studio draft", () => {
    expect(
      marketplaceMissingMediaAlert({
        kind: "CLASS",
        objectId: "class-1",
        objectName: "Hip Hop",
        coverImageUrl: null,
      }),
    ).toEqual({
      kind: "CLASS",
      objectId: "class-1",
      objectName: "Hip Hop",
      message: "Add a cover photo so this class can appear on classa.",
    });
    expect(
      marketplaceMissingMediaAlert({
        kind: "STUDIO",
        objectId: "studio-1",
        objectName: "Rhythm",
        heroDesktopUrl: "heroes/rh.png",
      }),
    ).toBeNull();
    expect(
      marketplaceMissingMediaAlert({
        kind: "TRAINER",
        objectId: "trainer-1",
        objectName: "Priya",
        photoUrl: "  ",
      })?.message,
    ).toBe("Add a photo so this trainer can appear on classa.");
  });

  it("only attaches freelance trainers who published availability", () => {
    expect(
      freelanceTrainerAttachError({
        role: "STUDENT",
        active: true,
        alreadyLinked: false,
        homeStudio: false,
        hasAvailability: true,
      }),
    ).toBe("Only trainers can be attached");
    expect(
      freelanceTrainerAttachError({
        role: "TRAINER",
        active: true,
        alreadyLinked: true,
        homeStudio: false,
        hasAvailability: true,
      }),
    ).toBe("Trainer is already attached");
    expect(
      freelanceTrainerAttachError({
        role: "TRAINER",
        active: true,
        alreadyLinked: false,
        homeStudio: false,
        hasAvailability: false,
      }),
    ).toBe("Trainer has no published availability");
    expect(
      freelanceTrainerAttachError({
        role: "TRAINER",
        active: true,
        alreadyLinked: false,
        homeStudio: false,
        hasAvailability: true,
      }),
    ).toBeNull();
  });
});
