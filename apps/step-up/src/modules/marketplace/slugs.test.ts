import { describe, expect, it } from "vitest";
import {
  classDetailTitle,
  marketplaceTrainerSlug,
  studioDetailTitle,
  trainerDetailTitle,
} from "./slugs";

describe("marketplace slugs", () => {
  it("falls back to id when a trainer has no public slug", () => {
    expect(marketplaceTrainerSlug({ id: "trainer-1", slug: null })).toBe(
      "trainer-1",
    );
    expect(marketplaceTrainerSlug({ id: "trainer-1", slug: "priya" })).toBe(
      "priya",
    );
  });

  it("builds SEO titles from class, studio, and trainer fields", () => {
    expect(
      classDetailTitle({
        name: "Hip Hop Foundations",
        studioName: "Rhythm House",
        locality: "T Nagar",
      }),
    ).toBe("Hip Hop Foundations · Rhythm House · T Nagar");
    expect(
      studioDetailTitle({
        name: "Rhythm House",
        locality: "T Nagar",
        primaryCategory: "DANCE",
      }),
    ).toBe("Rhythm House · T Nagar · Dance");
    expect(
      trainerDetailTitle({
        name: "Priya",
        categories: ["DANCE"],
        city: "Chennai",
      }),
    ).toBe("Priya · Dance in Chennai");
  });
});
