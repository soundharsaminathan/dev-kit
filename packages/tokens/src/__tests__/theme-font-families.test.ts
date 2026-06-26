import { describe, expect, it } from "vitest";
import { THEME_FONT_FAMILIES } from "../theme-font-families.js";

describe("theme-font-families", () => {
  it("lists supported theme font families", () => {
    expect(THEME_FONT_FAMILIES).toContain("Inter");
    expect(THEME_FONT_FAMILIES.length).toBeGreaterThan(3);
  });
});
