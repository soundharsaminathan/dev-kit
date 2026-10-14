import { describe, expect, it } from "vitest";
import {
  backfillClassAudience,
  marketplaceCategoryFromStyles,
  studioMarketplaceCategories,
  trainerMarketplaceCategories,
  trainerStudioBackfillRows,
} from "./marketplace.backfill";

describe("marketplace backfill", () => {
  it("classifies batch styles into the four public categories", () => {
    expect(
      marketplaceCategoryFromStyles([{ name: "Hip Hop" }]),
    ).toBe("DANCE");
    expect(marketplaceCategoryFromStyles([{ name: "Piano" }])).toBe("MUSIC");
    expect(marketplaceCategoryFromStyles([{ name: "Yoga" }])).toBe("FITNESS");
    expect(marketplaceCategoryFromStyles([{ name: "Painting" }])).toBe("ART");
    expect(marketplaceCategoryFromStyles([])).toBe("DANCE");
  });

  it("lets one studio own two categories with a primary", () => {
    const result = studioMarketplaceCategories([
      [{ name: "Hip Hop" }],
      [{ name: "Hip Hop" }],
      [{ name: "Yoga" }],
    ]);
    expect(result.categories).toEqual(["DANCE", "FITNESS"]);
    expect(result.primary).toBe("DANCE");
  });

  it("maps class audience from the existing batch category", () => {
    expect(backfillClassAudience("KIDS")).toBe("KIDS");
    expect(backfillClassAudience("ADULTS")).toBe("ADULTS");
  });

  it("does not invent a home studio for freelance trainers", () => {
    expect(
      trainerStudioBackfillRows([
        { id: "staff", studioId: "studio-1" },
        { id: "freelance", studioId: null },
      ]),
    ).toEqual([{ trainerId: "staff", studioId: "studio-1", isHome: true }]);
  });

  it("unions trainer styles and taught batches", () => {
    expect(
      trainerMarketplaceCategories({
        styles: ["Piano"],
        batchDanceCategories: [[{ name: "Hip Hop" }]],
      }),
    ).toEqual(["DANCE", "MUSIC"]);
  });
});
