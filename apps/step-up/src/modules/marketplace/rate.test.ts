import { describe, expect, it } from "vitest";
import {
  marketplaceRatingStars,
  ratePromptHint,
  ratePromptTitle,
  type MarketplaceRatingPrompt,
} from "./rate";

function prompt(
  overrides: Partial<MarketplaceRatingPrompt> = {},
): MarketplaceRatingPrompt {
  return {
    studentId: "child-1",
    studentName: "Asha",
    target: "STUDIO",
    studioId: "studio-1",
    studioName: "E-Grade",
    trainerId: null,
    trainerName: null,
    category: "DANCE",
    source: "CLASS",
    attendedAt: "2026-09-18T10:00:00.000Z",
    className: "Adults Advance",
    ...overrides,
  };
}

describe("marketplace rate helpers", () => {
  it("rejects half stars", () => {
    expect(marketplaceRatingStars(4.5)).toBeNull();
    expect(marketplaceRatingStars(5)).toBe(5);
  });

  it("titles the prompt for the visit target", () => {
    expect(ratePromptTitle(prompt())).toBe("Rate E-Grade");
    expect(
      ratePromptTitle(
        prompt({
          target: "TRAINER",
          trainerId: "t1",
          trainerName: "Selva",
        }),
      ),
    ).toBe("Rate Selva");
  });

  it("keeps trial copy separate from class", () => {
    expect(ratePromptHint(prompt({ source: "TRIAL" }))).toBe(
      "Your trial at Adults Advance · E-Grade",
    );
  });
});
