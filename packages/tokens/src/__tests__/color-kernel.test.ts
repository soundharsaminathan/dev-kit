import { describe, expect, it } from "vitest";
import {
  gamutMap,
  oklchCss,
  onBlackWhite,
  resolvePaletteSeeds,
  toOklch,
} from "../vendor/color-kernel.js";

describe("color-kernel", () => {
  it("resolves palette ramps for light and dark modes", () => {
    const palettes = resolvePaletteSeeds({
      neutral: "#64748b",
      accent: "#3b82f6",
      success: "#16a34a",
      warning: "#f59e0b",
      danger: "#dc2626",
      info: "#0ea5e9",
    });

    expect(palettes.steps.length).toBeGreaterThan(0);
    expect(palettes.light.neutral?.["500"]).toContain("oklch(");
    expect(palettes.dark.neutral?.["500"]).toContain("oklch(");
    expect(palettes.light.success?.["500"]).toBeDefined();
  });

  it("falls back to default status seeds when optional seeds are omitted", () => {
    const palettes = resolvePaletteSeeds({
      neutral: "#64748b",
      accent: "#3b82f6",
    });

    expect(palettes.light.success?.["500"]).toBeDefined();
    expect(palettes.light.warning?.["500"]).toBeDefined();
    expect(palettes.light.danger?.["500"]).toBeDefined();
    expect(palettes.light.info?.["500"]).toBeDefined();
  });

  it("picks readable foreground colors for ramp steps", () => {
    expect(onBlackWhite("#ffffff")).toBe("black");
    expect(onBlackWhite("#000000")).toBe("white");
    expect(onBlackWhite("oklch(0.5 0 0)")).toMatch(/black|white/);
  });

  it("normalizes oklch output for achromatic colors", () => {
    expect(oklchCss({ l: 0.5, c: 0, h: 0 })).toBe("oklch(0.5 0 0)");
    expect(oklchCss(gamutMap(toOklch("#808080")))).toContain("oklch(");
    expect(oklchCss(gamutMap({ l: 0.5, c: 0.2, h: Number.NaN }))).toContain(
      "oklch(",
    );
  });

  it("maps string and oklch inputs through onBlackWhite", () => {
    const neutral = resolvePaletteSeeds({
      neutral: "#64748b",
      accent: "#3b82f6",
    }).light.neutral?.["500"];

    if (!neutral) {
      throw new Error("Expected neutral ramp step");
    }

    expect(onBlackWhite(neutral)).toMatch(/black|white/);
  });

  it("generates every scale step for each palette", () => {
    const palettes = resolvePaletteSeeds({
      neutral: "#64748b",
      accent: "#3b82f6",
    });

    for (const step of palettes.steps) {
      expect(palettes.light.accent?.[step]).toMatch(/^oklch\(/);
      expect(palettes.dark.accent?.[step]).toMatch(/^oklch\(/);
    }
  });
});
