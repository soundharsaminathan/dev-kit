import { describe, expect, it } from "vitest";
import {
  clusterMarketplacePins,
  marketplacePinsForItems,
  marketplacePlaceTitle,
  marketplaceSeoPath,
  parseMarketplaceCity,
  parseMarketplacePlace,
} from "./place";

describe("marketplace SEO places", () => {
  it("parses city/style and city/area without inventing chip routes", () => {
    expect(parseMarketplaceCity("chennai")).toEqual({
      id: "chennai",
      label: "Chennai",
    });
    expect(parseMarketplaceCity("classes")).toBeNull();
    expect(parseMarketplacePlace("hip-hop")).toEqual({
      kind: "style",
      id: "hip-hop",
      label: "Hip Hop",
    });
    expect(parseMarketplacePlace("adyar")).toEqual({
      kind: "locality",
      id: "adyar",
      label: "Adyar",
    });
    expect(parseMarketplacePlace("beginner")).toBeNull();
    expect(marketplaceSeoPath({ city: "chennai", style: "hip-hop" })).toBe(
      "/chennai/hip-hop",
    );
    expect(marketplaceSeoPath({ city: "chennai", locality: "adyar" })).toBe(
      "/chennai/adyar",
    );
  });

  it("titles a shared place URL from the same inventory IA", () => {
    expect(
      marketplacePlaceTitle({
        categoryLabel: "Dance",
        cityLabel: "Chennai",
        tab: "classes",
        place: { kind: "style", id: "hip-hop", label: "Hip Hop" },
      }),
    ).toBe("Hip Hop classes in Chennai");
    expect(
      marketplacePlaceTitle({
        categoryLabel: "Dance",
        cityLabel: "Chennai",
        tab: "classes",
        place: { kind: "locality", id: "adyar", label: "Adyar" },
      }),
    ).toBe("Dance classes in Adyar");
  });

  it("rejects unknown and reserved places so they cannot steal app routes", () => {
    expect(parseMarketplacePlace("beginner")).toBeNull();
    expect(parseMarketplacePlace("classes")).toBeNull();
    expect(parseMarketplaceCity("me")).toBeNull();
    expect(marketplaceSeoPath({ city: "chennai", style: "beginner" })).toBeNull();
  });

  it("keeps map pins on the same visible result set and clusters when zoomed out", () => {
    const pins = [
      {
        id: "branch-1",
        lat: 13.04,
        lng: 80.24,
        itemIds: ["class-1", "hidden"],
      },
      {
        id: "branch-2",
        lat: 13.2,
        lng: 80.3,
        itemIds: ["class-2"],
      },
    ];
    expect(marketplacePinsForItems(pins, ["class-1"])).toEqual([
      {
        id: "branch-1",
        lat: 13.04,
        lng: 80.24,
        itemIds: ["class-1"],
      },
    ]);
    expect(clusterMarketplacePins(pins, 14)).toHaveLength(2);
    expect(clusterMarketplacePins(pins, 10)[0]?.count).toBeGreaterThanOrEqual(1);
  });
});
