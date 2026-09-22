import { describe, expect, it } from "vitest";
import {
  audienceMatches,
  catalogEmpty,
  catalogLimit,
  classPassesPublicGates,
  compareCatalogItems,
  parseClassLevel,
  parseMarketplaceCategory,
  parseMarketplaceSort,
  searchFieldsMatch,
  studioPassesPublicGates,
  toRatingView,
  trainerPassesPublicGates,
  usesMarketplaceCatalogQuery,
} from "./marketplace-catalog.query";
import type { SortableCatalogItem } from "./marketplace-catalog.query";

function item(partial: Partial<SortableCatalogItem>): SortableCatalogItem {
  return {
    bookable: true,
    distanceKm: 2,
    nextAt: Date.parse("2026-09-22T10:00:00.000Z"),
    priceFrom: 1500,
    ratingAvg: 4.8,
    ratingCount: 12,
    popularity: 20,
    name: "Alpha",
    searchScore: 0,
    ...partial,
  };
}

describe("marketplace catalog query", () => {
  it("defaults category to Dance and maps lowercase category", () => {
    expect(parseMarketplaceCategory(undefined)).toBe("DANCE");
    expect(parseMarketplaceCategory("music")).toBe("MUSIC");
    expect(parseMarketplaceCategory("ART")).toBe("ART");
  });

  it("defaults sort to availability unless a query is present", () => {
    expect(parseMarketplaceSort(undefined)).toBe("availability");
    expect(parseMarketplaceSort(undefined, "hip hop")).toBe("relevance");
    expect(parseMarketplaceSort("price")).toBe("price");
  });

  it("parses class level chips", () => {
    expect(parseClassLevel("beginner")).toBe("BEGINNER");
    expect(parseClassLevel("ADVANCED")).toBe("ADVANCED");
    expect(parseClassLevel("nope")).toBeUndefined();
  });

  it("keeps Kids classes when audience=KIDS", () => {
    expect(audienceMatches("KIDS", "KIDS")).toBe(true);
    expect(audienceMatches("BOTH", "KIDS")).toBe(true);
    expect(audienceMatches("ADULTS", "KIDS")).toBe(false);
  });

  it("hides classes without a public cover", () => {
    expect(
      classPassesPublicGates({
        coverImageUrl: null,
        studioActive: true,
        publicClasses: true,
        hasBranch: true,
        hasSchedule: true,
        testStudio: false,
      }),
    ).toBe(false);
    expect(
      classPassesPublicGates({
        coverImageUrl: "https://cdn.example/class.jpg",
        studioActive: true,
        publicClasses: true,
        hasBranch: true,
        hasSchedule: true,
        testStudio: false,
      }),
    ).toBe(true);
  });

  it("does not hide a studio because one batch has no cover", () => {
    expect(
      studioPassesPublicGates({
        studioActive: true,
        publicStudioListing: true,
        testStudio: false,
        heroDesktopUrl: "https://cdn.example/hero.jpg",
        inventoryInCategory: true,
      }),
    ).toBe(true);
  });

  it("hides trainers without a photo", () => {
    expect(
      trainerPassesPublicGates({
        photoUrl: null,
        hasCategory: true,
        listedAtPublicStudio: true,
        independent: false,
      }),
    ).toBe(false);
  });

  it("matches search tokens and typo-tolerant names", () => {
    expect(
      searchFieldsMatch(["Hip Hop Foundations", "Rhythm"], "hip hop").matched,
    ).toBe(true);
    expect(searchFieldsMatch(["Bharatanatyam"], "bharatanatyam").matched).toBe(
      true,
    );
    expect(searchFieldsMatch(["Western Ballet"], "ballet").matched).toBe(true);
    expect(searchFieldsMatch(["Adyar Studio"], "adyar").matched).toBe(true);
    expect(searchFieldsMatch(["No Match"], "zzz").matched).toBe(false);
  });

  it("sorts bookable first, then nearest, then earliest", () => {
    const soldOut = item({
      bookable: false,
      name: "Sold Out",
      distanceKm: 0.2,
      nextAt: Date.parse("2026-09-21T08:00:00.000Z"),
    });
    const farSoon = item({
      name: "Far Soon",
      distanceKm: 8,
      nextAt: Date.parse("2026-09-21T09:00:00.000Z"),
    });
    const nearLater = item({
      name: "Near Later",
      distanceKm: 1,
      nextAt: Date.parse("2026-09-23T09:00:00.000Z"),
    });
    const ranked = [soldOut, farSoon, nearLater].sort((a, b) =>
      compareCatalogItems(a, b, "availability"),
    );
    expect(ranked.map((row) => row.name)).toEqual([
      "Near Later",
      "Far Soon",
      "Sold Out",
    ]);
  });

  it("puts missing prices last on price sort", () => {
    const priced = item({ name: "Priced", priceFrom: 900 });
    const missing = item({ name: "Ask studio", priceFrom: null });
    const ranked = [missing, priced].sort((a, b) =>
      compareCatalogItems(a, b, "price"),
    );
    expect(ranked.map((row) => row.name)).toEqual(["Priced", "Ask studio"]);
  });

  it("keeps ratings with fewer than 3 reviews off the rating ranking", () => {
    const newStudio = item({
      name: "New",
      ratingAvg: 5,
      ratingCount: 2,
    });
    const proven = item({
      name: "Proven",
      ratingAvg: 4.2,
      ratingCount: 9,
    });
    const ranked = [newStudio, proven].sort((a, b) =>
      compareCatalogItems(a, b, "rating"),
    );
    expect(ranked[0]?.name).toBe("Proven");
    expect(toRatingView(5, 2).visible).toBe(false);
    expect(toRatingView(4.2, 9).visible).toBe(true);
  });

  it("returns category empty copy when the city has no sibling inventory", () => {
    const empty = catalogEmpty(
      0,
      { category: "MUSIC", city: "chennai" },
      "classes",
      0,
      "Music",
      "Chennai",
    );
    expect(empty.kind).toBe("category");
    expect(empty.message).toContain("Music");
    expect(empty.message).toContain("Chennai");
  });

  it("returns tab empty copy when studios exist but classes do not", () => {
    const empty = catalogEmpty(
      0,
      { category: "DANCE", city: "chennai" },
      "classes",
      3,
      "Dance",
      "Chennai",
    );
    expect(empty.kind).toBe("tab");
    expect(empty.message).toContain("studios");
  });

  it("returns filter empty copy when a search or audience narrowed the list", () => {
    const empty = catalogEmpty(
      0,
      { category: "DANCE", city: "chennai", q: "kathak" },
      "classes",
      4,
      "Dance",
      "Chennai",
    );
    expect(empty.kind).toBe("filters");
    expect(empty.message).toContain("filters");
  });

  it("caps catalog limits", () => {
    expect(catalogLimit()).toBe(24);
    expect(catalogLimit(99)).toBe(48);
  });

  it("switches the studios list to the catalog envelope for marketplace queries", () => {
    expect(usesMarketplaceCatalogQuery({ category: "DANCE" })).toBe(true);
    expect(usesMarketplaceCatalogQuery({ sort: "availability" })).toBe(true);
    expect(usesMarketplaceCatalogQuery({ category: "dance" })).toBe(false);
    expect(usesMarketplaceCatalogQuery({})).toBe(false);
  });
});
