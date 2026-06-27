import { describe, expect, it } from "vitest";
import {
  gamutMap,
  oklchCss,
  onBlackWhite,
  resample,
  resolvePaletteSeeds,
  toOklch,
  toSrgb,
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

  it("generates light and dark palette maps", () => {
    const palettes = resolvePaletteSeeds({
      neutral: "#475569",
      accent: "#7c3aed",
    });

    expect(Object.keys(palettes.light)).toContain("accent");
    expect(Object.keys(palettes.dark)).toContain("accent");
    expect(palettes.steps).toHaveLength(11);
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

  it("uses explicit status seeds when provided", () => {
    const palettes = resolvePaletteSeeds({
      neutral: "#64748b",
      accent: "#3b82f6",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
      info: "#06b6d4",
    });

    expect(palettes.light.success?.["500"]).toBeDefined();
    expect(palettes.light.warning?.["500"]).toBeDefined();
    expect(palettes.dark.danger?.["500"]).toBeDefined();
  });

  it("skips empty optional status seeds", () => {
    const palettes = resolvePaletteSeeds({
      neutral: "#64748b",
      accent: "#3b82f6",
      success: "",
      warning: "",
      danger: "",
      info: "",
    });

    expect(palettes.light.success?.["500"]).toBeUndefined();
    expect(palettes.light.accent?.["500"]).toBeDefined();
  });

  it("uses minimum peak chroma for low-chroma accent seeds", () => {
    const palettes = resolvePaletteSeeds({
      neutral: "#64748b",
      accent: "#808080",
    });

    expect(palettes.light.accent?.["500"]).toMatch(/^oklch\(/);
  });

  it("caps chroma for neutral ramps", () => {
    const palettes = resolvePaletteSeeds({
      neutral: "#ff00ff",
      accent: "#3b82f6",
    });

    expect(palettes.light.neutral?.["500"]).toMatch(/^oklch\(/);
  });

  it("picks readable foreground colors for ramp steps", () => {
    expect(onBlackWhite("#ffffff")).toBe("black");
    expect(onBlackWhite("#000000")).toBe("white");
    expect(onBlackWhite("oklch(0.5 0 0)")).toMatch(/black|white/);
  });

  it("chooses white text on dark backgrounds and black text on light backgrounds", () => {
    expect(onBlackWhite("#111111")).toBe("white");
    expect(onBlackWhite("#f5f5f5")).toBe("black");
    expect(onBlackWhite(oklchCss(gamutMap(toOklch("#1e293b"))))).toBe("white");
  });

  it("handles low channel values in contrast calculation", () => {
    expect(onBlackWhite("#010101")).toBe("white");
    expect(onBlackWhite("#fefefe")).toBe("black");
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

  it("normalizes oklch output for achromatic colors", () => {
    expect(oklchCss({ l: 0.5, c: 0, h: 0 })).toBe("oklch(0.5 0 0)");
    expect(oklchCss(gamutMap(toOklch("#808080")))).toContain("oklch(");
    expect(oklchCss(gamutMap({ l: 0.5, c: 0.2, h: Number.NaN }))).toContain(
      "oklch(",
    );
  });

  it("normalizes null and NaN hues when converting to oklch", () => {
    expect(toOklch("#808080").h).toBeTypeOf("number");
    expect(gamutMap({ l: 0.5, c: 0.2, h: Number.NaN }).h).toBe(0);
    expect(oklchCss({ l: 0.5, c: 0.2, h: Number.NaN })).toMatch(/oklch\(/);
  });

  it("formats chromatic oklch with normalized hue", () => {
    expect(oklchCss({ l: 0.6, c: 0.15, h: -30 })).toMatch(
      /oklch\(0\.6 0\.15 330\)/,
    );
    expect(oklchCss({ l: 0.6, c: 0.15, h: 390 })).toMatch(
      /oklch\(0\.6 0\.15 30\)/,
    );
  });

  it("normalizes achromatic and near-achromatic css output", () => {
    expect(oklchCss({ l: 0.5, c: 0.0004, h: 120 })).toBe("oklch(0.5 0 0)");
    expect(oklchCss({ l: 0.5, c: 0.001, h: 120 })).toMatch(/120/);
  });

  it("clamps lightness and chroma in oklchCss output", () => {
    expect(oklchCss({ l: 1.5, c: -0.1, h: 0 })).toBe("oklch(1 0 0)");
    expect(oklchCss({ l: -0.2, c: 0.05, h: 180 })).toMatch(/oklch\(0 /);
  });

  it("handles vivid accent seeds with gamut mapping", () => {
    const vivid = gamutMap(toOklch("#ff00ff"));
    expect(oklchCss(vivid)).toMatch(/oklch\(/);
    expect(onBlackWhite(oklchCss(vivid))).toMatch(/black|white/);
  });

  it("converts oklch objects to srgb channels", () => {
    const channels = toSrgb(gamutMap(toOklch("#336699")));
    expect(channels.r).toBeGreaterThanOrEqual(0);
    expect(channels.b).toBeLessThanOrEqual(1);
  });

  it("converts hex strings to srgb channels", () => {
    const channels = toSrgb("#336699");
    expect(channels.r).toBeGreaterThan(0);
    expect(channels.g).toBeGreaterThan(0);
    expect(channels.b).toBeGreaterThan(0);
  });

  it("resamples anchor arrays for ramp generation", () => {
    expect(resample([1, 2, 3], 1)).toEqual([3]);
    expect(resample([1, 2, 3], 0)).toEqual([3]);
    expect(resample([1, 2, 3], 3)).toEqual([1, 2, 3]);
    expect(resample([0, 10], 3)).toEqual([0, 5, 10]);
    expect(resample([0, 50, 100], 5)).toEqual([0, 25, 50, 75, 100]);
  });
});
