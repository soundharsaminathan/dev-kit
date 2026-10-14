import { describe, expect, it } from "vitest";
import { AGE_RANGES, EXPERIENCE_LEVELS, GENDERS } from "./options";

describe("onboarding options", () => {
  it("exposes stable experience level ids for API payloads", () => {
    expect(EXPERIENCE_LEVELS.map((level) => level.id)).toEqual([
      "BEGINNER",
      "SOME_EXPERIENCE",
      "INTERMEDIATE",
      "ADVANCED",
    ]);
  });

  it("exposes gender and age-range ids used by student create + onboarding", () => {
    expect(GENDERS.map((item) => item.id)).toEqual(["FEMALE", "MALE"]);
    expect(AGE_RANGES.map((item) => item.id)).toEqual(
      expect.arrayContaining(["TWENTY_TO_FORTY"]),
    );
  });
});
