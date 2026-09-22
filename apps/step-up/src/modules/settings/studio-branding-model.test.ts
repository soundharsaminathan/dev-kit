import { describe, expect, it } from "vitest";
import { studioBrandingCompletion } from "./studio-branding-model";

describe("studio branding completion", () => {
  it("scores logo and both hero slots", () => {
    expect(
      studioBrandingCompletion({
        hasLogo: false,
        hasMobileHero: false,
        hasDesktopHero: false,
      }).percent,
    ).toBe(0);

    expect(
      studioBrandingCompletion({
        hasLogo: true,
        hasMobileHero: false,
        hasDesktopHero: false,
      }).percent,
    ).toBe(33);

    expect(
      studioBrandingCompletion({
        hasLogo: true,
        hasMobileHero: true,
        hasDesktopHero: true,
      }).percent,
    ).toBe(100);
  });
});
