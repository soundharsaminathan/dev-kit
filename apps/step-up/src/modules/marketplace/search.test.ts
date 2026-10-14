import { afterEach, describe, expect, it } from "vitest";
import {
  clearMarketplaceFilters,
  MARKETPLACE_CATEGORY_KEY,
  mapDiscoverToMarketplace,
  marketplaceCanonicalPath,
  marketplaceCatalogQuery,
  marketplaceNavigateArgs,
  marketplacePageShouldIndex,
  marketplacePathForTab,
  marketplaceTitle,
  matchesWhenFilter,
  parseMarketplaceCategory,
  parseMarketplaceSearch,
  toggleAudience,
} from "./search";

describe("marketplace search contract", () => {
  afterEach(() => {
    window.localStorage.removeItem(MARKETPLACE_CATEGORY_KEY);
  });

  it("first-paints Dance in Chennai and remembers a chosen category", () => {
    expect(parseMarketplaceSearch({}).category).toBe("DANCE");
    expect(parseMarketplaceSearch({}).city).toBe("chennai");
    window.localStorage.setItem(MARKETPLACE_CATEGORY_KEY, "MUSIC");
    expect(parseMarketplaceSearch({}).category).toBe("MUSIC");
    expect(parseMarketplaceSearch({ category: "ART" }).category).toBe("ART");
  });

  it("maps legacy discover search onto marketplace filters", () => {
    const mapped = mapDiscoverToMarketplace({
      category: "dance",
      q: "hip hop",
      city: "chennai",
      audience: "KIDS",
      locality: "adyar",
    });
    expect(mapped.category).toBe("DANCE");
    expect(mapped.q).toBe("hip hop");
    expect(mapped.audience).toBe("KIDS");
    expect(mapped.locality).toBe("adyar");
    expect(marketplacePathForTab("studios")).toBe("/studios");
    expect(marketplacePathForTab("trainers", "member")).toBe("/me/book");
    expect(parseMarketplaceSearch({ tab: "trainers" }).tab).toBe("trainers");
  });

  it("defaults sort to availability, or relevance when searching", () => {
    expect(marketplaceCatalogQuery({}).sort).toBe("availability");
    expect(marketplaceCatalogQuery({ q: "ballet" }).sort).toBe("relevance");
    expect(marketplaceCatalogQuery({ q: "ballet", sort: "price" }).sort).toBe(
      "price",
    );
  });

  it("titles the page as category + tab + city", () => {
    expect(marketplaceTitle("DANCE", "Chennai", "classes")).toBe(
      "Dance classes in Chennai",
    );
    expect(marketplaceTitle("MUSIC", "Chennai", "trainers")).toBe(
      "Music trainers in Chennai",
    );
  });

  it("keeps Kids as a toggle, not a route", () => {
    expect(toggleAudience(undefined, "KIDS")).toBe("KIDS");
    expect(toggleAudience("KIDS", "KIDS")).toBeUndefined();
    expect(parseMarketplaceCategory("fitness")).toBe("FITNESS");
  });

  it("filters today / tomorrow against the next session", () => {
    const today = new Date(2026, 8, 20, 10, 0, 0);
    const laterToday = new Date(2026, 8, 20, 18, 0, 0).toISOString();
    const tomorrow = new Date(2026, 8, 21, 9, 0, 0).toISOString();
    expect(matchesWhenFilter(laterToday, "today", today)).toBe(true);
    expect(matchesWhenFilter(tomorrow, "today", today)).toBe(false);
    expect(matchesWhenFilter(tomorrow, "tomorrow", today)).toBe(true);
  });

  it("clears chips without losing category or city", () => {
    expect(
      clearMarketplaceFilters({
        category: "ART",
        city: "chennai",
        q: "kathak",
        audience: "KIDS",
      }),
    ).toEqual({ category: "ART", city: "chennai" });
  });

  it("shares city/style and city/area on SEO paths, not chip routes", () => {
    expect(
      marketplacePathForTab("classes", "public", {
        city: "chennai",
        style: "hip-hop",
      }),
    ).toBe("/$city/$place");
    expect(
      marketplaceNavigateArgs("studios", {
        city: "chennai",
        locality: "adyar",
      }),
    ).toEqual({
      to: "/$city/$place",
      params: { city: "chennai", place: "adyar" },
      search: { tab: "studios" },
    });
    expect(
      marketplaceCanonicalPath(
        { city: "chennai", style: "hip-hop" },
        "classes",
      ),
    ).toBe("/chennai/hip-hop");
    expect(
      marketplacePageShouldIndex(
        { city: "chennai", style: "hip-hop" },
        true,
        true,
      ),
    ).toBe(true);
    expect(
      marketplacePageShouldIndex(
        { city: "chennai", style: "hip-hop" },
        true,
        false,
      ),
    ).toBe(false);
    expect(
      marketplacePageShouldIndex(
        { city: "chennai", style: "hip-hop", audience: "KIDS" },
        true,
        true,
      ),
    ).toBe(false);
    expect(marketplacePageShouldIndex({ city: "chennai" }, false)).toBe(false);
  });
});
