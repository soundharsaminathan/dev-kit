import { describe, expect, it } from "vitest";
import { resolveTheme, resolveThemeById } from "../theme/resolve-theme.js";
import { glassTheme, materialTheme } from "../themes/index.js";

describe("resolveTheme", () => {
  it("resolves default theme with color and tokens", () => {
    const resolved = resolveThemeById("default");
    expect(resolved.id).toBe("default");
    expect(resolved.color?.seeds.neutral).toBe("#737373");
    expect(resolved.tokens.components["btn-radius"]).toBeDefined();
  });

  it("inherits and merges material overrides", () => {
    const resolved = resolveTheme(materialTheme);
    expect(resolved.radiusFactor).toBe(0.75);
    expect(
      resolved.tokens.interaction["interaction-press-scale"]?.target,
    ).toEqual({ value: "0.98" });
    expect(resolved.color?.seeds.neutral).toBe("#737373");
  });

  it("inherits glass component overrides", () => {
    const resolved = resolveTheme(glassTheme);
    expect(
      resolved.tokens.interaction["interaction-hover-scale"]?.target,
    ).toEqual({ value: "1.02" });
  });

  it("detects inheritance cycles", () => {
    const a = {
      id: "a",
      label: "A",
      extends: "b",
      color: {
        algorithm: "oklch" as const,
        seeds: { neutral: "#000", accent: "#00f" },
      },
    };
    const b = {
      id: "b",
      label: "B",
      extends: "a",
      color: {
        algorithm: "oklch" as const,
        seeds: { neutral: "#000", accent: "#00f" },
      },
    };
    expect(() => resolveTheme(a, { a, b })).toThrow(/cycle/i);
  });
});
