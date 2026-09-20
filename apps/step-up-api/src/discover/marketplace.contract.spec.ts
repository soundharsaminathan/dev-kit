import { describe, expect, it } from "vitest";
import {
  batchSlugFromName,
  canRefundPaidMarketplaceBooking,
  classAudienceFromBatchCategory,
  defaultMarketplaceSort,
  emptyMarketplaceCopy,
  fieldMatchesTokens,
  hasPublicClassCover,
  hasPublicStudioCover,
  hasPublicTrainerPhoto,
  isJoinBookable,
  isPublicMarketplaceCategory,
  marketplaceFirstPaint,
  marketplaceRatingUniqueKey,
  PUBLIC_MARKETPLACE_CATEGORIES,
  publicRatingOrNew,
  seatCopy,
  tokenizeSearch,
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
