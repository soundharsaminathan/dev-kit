import { describe, expect, it } from "vitest";
import {
  gamutMap,
  oklchCss,
  onBlackWhite,
  resolvePaletteSeeds,
  toOklch,
} from "../vendor/color-kernel.js";

describe("color-kernel additional branches", () => {
  it("generates light and dark palette maps", () => {
    const palettes = resolvePaletteSeeds({
      neutral: "#475569",
      accent: "#7c3aed",
    });

    expect(Object.keys(palettes.light)).toContain("accent");
    expect(Object.keys(palettes.dark)).toContain("accent");
    expect(palettes.steps).toHaveLength(11);
  });

  it("handles vivid accent seeds with gamut mapping", () => {
    const vivid = gamutMap(toOklch("#ff00ff"));
    expect(oklchCss(vivid)).toMatch(/oklch\(/);
    expect(onBlackWhite(oklchCss(vivid))).toMatch(/black|white/);
  });

  it("normalizes achromatic and near-achromatic css output", () => {
    expect(oklchCss({ l: 0.5, c: 0.0004, h: 120 })).toBe("oklch(0.5 0 0)");
    expect(oklchCss({ l: 0.5, c: 0.001, h: 120 })).toMatch(/120/);
  });

  it("computes contrast for mid-tone srgb inputs", () => {
    expect(onBlackWhite("#7f7f7f")).toMatch(/black|white/);
    expect(onBlackWhite("oklch(0.62 0.19 142)")).toMatch(/black|white/);
  });

  it("covers low and high channel linearization paths", () => {
    for (const color of ["#020202", "#0a0a0a", "#f8f8f8", "#fefefe"]) {
      expect(onBlackWhite(color)).toMatch(/black|white/);
    }
  });
});
