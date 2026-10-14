import { describe, expect, it } from "vitest";
import { buildMarketplaceQuery } from "./catalog";
import {
  defaultMarketplaceSort,
  marketplaceFirstPaint,
  marketplaceSeatCopy,
} from "./types";

describe("marketplace catalog client", () => {
  it("first-paints Dance · Chennai · Classes with availability sort", () => {
    const paint = marketplaceFirstPaint();
    expect(paint).toEqual({
      city: "chennai",
      category: "DANCE",
      tab: "classes",
      sort: "availability",
    });
    expect(buildMarketplaceQuery()).toContain("category=DANCE");
    expect(buildMarketplaceQuery()).toContain("city=chennai");
    expect(buildMarketplaceQuery()).toContain("sort=availability");
  });

  it("switches default sort to relevance when searching", () => {
    expect(defaultMarketplaceSort("hip hop")).toBe("relevance");
    expect(buildMarketplaceQuery({ q: "hip hop" })).toContain(
      "sort=relevance",
    );
    expect(buildMarketplaceQuery({ q: "hip hop", sort: "price" })).toContain(
      "sort=price",
    );
  });

  it("keeps seat copy on the contract: Full / N left / omit", () => {
    expect(marketplaceSeatCopy(0)).toBe("Full");
    expect(marketplaceSeatCopy(1)).toBe("1 seat left");
    expect(marketplaceSeatCopy(5)).toBe("5 seats left");
    expect(marketplaceSeatCopy(6)).toBeNull();
  });

  it("sends audience and level chips without inventing routes", () => {
    const qs = buildMarketplaceQuery({
      audience: "KIDS",
      level: "BEGINNER",
      category: "MUSIC",
    });
    expect(qs).toContain("audience=KIDS");
    expect(qs).toContain("level=BEGINNER");
    expect(qs).toContain("category=MUSIC");
  });

  it("sends the selected child when a parent is browsing", () => {
    expect(
      buildMarketplaceQuery({ category: "DANCE" }, { studentId: "kid-1" }),
    ).toContain("studentId=kid-1");
  });
});
