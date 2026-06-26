import { describe, expect, it } from "vitest";
import {
  gamutMap,
  oklchCss,
  onBlackWhite,
  resolvePaletteSeeds,
  toOklch,
  toSrgb,
} from "../vendor/color-kernel.js";

describe("color-kernel branches", () => {
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

  it("chooses white text on dark backgrounds and black text on light backgrounds", () => {
    expect(onBlackWhite("#111111")).toBe("white");
    expect(onBlackWhite("#f5f5f5")).toBe("black");
    expect(onBlackWhite(oklchCss(gamutMap(toOklch("#1e293b"))))).toBe("white");
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

  it("clamps lightness and chroma in oklchCss output", () => {
    expect(oklchCss({ l: 1.5, c: -0.1, h: 0 })).toBe("oklch(1 0 0)");
    expect(oklchCss({ l: -0.2, c: 0.05, h: 180 })).toMatch(/oklch\(0 /);
  });

  it("handles low channel values in contrast calculation", () => {
    expect(onBlackWhite("#010101")).toBe("white");
    expect(onBlackWhite("#fefefe")).toBe("black");
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

  it("converts oklch objects to srgb channels", () => {
    const channels = toSrgb(gamutMap(toOklch("#336699")));
    expect(channels.r).toBeGreaterThanOrEqual(0);
    expect(channels.b).toBeLessThanOrEqual(1);
  });
});
