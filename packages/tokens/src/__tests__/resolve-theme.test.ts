import { describe, expect, it } from "vitest";
import { resolveTheme, resolveThemeById } from "../theme/resolve-theme.js";
import {
  auroraTheme,
  builtInThemes,
  getBuiltInTheme,
  glassmorphismTheme,
  materialTheme,
  neoBrutalismTheme,
  neumorphismTheme,
  normalizeThemeId,
  terminalTheme,
} from "../themes/index.js";
import type { CustomTheme, ThemeDefinition } from "../types.js";

const baseColor = builtInThemes.default.color!;

describe("resolveTheme", () => {
  it("resolves default theme with color and tokens", () => {
    const resolved = resolveThemeById("default");
    expect(resolved.id).toBe("default");
    expect(resolved.color?.seeds.neutral).toBe("#64748b");
    expect(resolved.tokens.components["btn-radius"]).toBeDefined();
    expect(resolved.tokens.components["scrollbar-size"]?.target).toEqual({
      value: "10px",
    });
  });

  it("inherits and merges material overrides", () => {
    const resolved = resolveTheme(materialTheme);
    expect(resolved.radiusFactor).toBe(0.75);
    expect(
      resolved.tokens.interaction["interaction-press-scale"]?.target,
    ).toEqual({ value: "0.98" });
    expect(resolved.color?.seeds.neutral).toBe("#64748b");
  });

  it("inherits glassmorphism component overrides", () => {
    const resolved = resolveTheme(glassmorphismTheme);
    expect(resolved.id).toBe("glassmorphism");
    expect(resolved.label).toBe("Glassmorphism");
    expect(
      resolved.tokens.interaction["interaction-hover-scale"]?.target,
    ).toEqual({ value: "1.02" });
    expect(resolved.tokens.components["card-backdrop-blur"]?.target).toEqual({
      ref: "glass-backdrop-blur",
    });
    expect(resolved.tokens.components["surface-background"]?.target).toEqual({
      ref: "glass-vibrant-background",
    });
    expect(
      resolved.tokens.components["scrollbar-thumb-background"]?.target,
    ).toEqual({
      ref: "glass-fill",
    });
  });

  it("resolves legacy glass theme alias", () => {
    expect(normalizeThemeId("glass")).toBe("glassmorphism");
    expect(getBuiltInTheme("glass")?.id).toBe("glassmorphism");
  });

  it("resolves legacy skeuomorphism theme alias to default", () => {
    expect(normalizeThemeId("skeuomorphism")).toBe("default");
    expect(getBuiltInTheme("skeuomorphism")?.id).toBe("default");
  });

  it("applies neumorphism hill and dent shadows", () => {
    const resolved = resolveTheme(neumorphismTheme);
    expect(resolved.color?.seeds.neutral).toBe("#64748b");
    expect(resolved.tokens.effects["neumo-hill"]).toBeDefined();
    expect(resolved.tokens.effects["neumo-dent"]).toBeDefined();
    expect(resolved.tokens.components["btn-shadow"]?.target).toEqual({
      ref: "neumo-hill",
    });
    expect(resolved.tokens.components["btn-pressed-shadow"]?.target).toEqual({
      ref: "neumo-dent",
    });
    expect(resolved.tokens.components["input-shadow"]?.target).toEqual({
      ref: "neumo-dent",
    });
    expect(resolved.tokens.components["card-shadow"]?.target).toEqual({
      ref: "neumo-hill",
    });
    expect(
      resolved.tokens.interaction["interaction-press-scale"]?.target,
    ).toEqual({ value: "1" });
  });

  it("applies neo-brutalism hard shadow and zero radius", () => {
    const resolved = resolveTheme(neoBrutalismTheme);
    expect(resolved.radiusFactor).toBe(0);
    expect(
      resolved.tokens.interaction["interaction-hover-scale"]?.target,
    ).toEqual({ value: "1.05" });
    expect(resolved.tokens.components["btn-radius"]?.target).toEqual({
      ref: "brutal-radius",
    });
  });

  it("applies aurora glow tokens", () => {
    const resolved = resolveTheme(auroraTheme);
    expect(resolved.tokens.effects["aurora-glow"]).toBeDefined();
    expect(resolved.tokens.components["card-shadow"]?.target).toEqual({
      ref: "aurora-glow",
    });
  });

  it("applies terminal monospace and glow tokens", () => {
    const resolved = resolveTheme(terminalTheme);
    expect(resolved.radiusFactor).toBe(0);
    expect(resolved.fonts?.sans).toContain("JetBrains Mono");
    expect(resolved.tokens.effects["terminal-glow"]).toBeDefined();
    expect(resolved.tokens.components["input-shadow"]?.target).toEqual({
      ref: "terminal-glow",
    });
  });

  it("inherits extends from the base theme when override omits it", () => {
    const resolved = resolveTheme({
      id: "child",
      label: "Child",
      color: baseColor,
    });

    expect(resolved.id).toBe("child");
    expect(resolved.color?.seeds.neutral).toBeDefined();
  });

  it("detects inheritance cycles", () => {
    const a: ThemeDefinition = {
      id: "a",
      label: "A",
      extends: "b",
      color: baseColor,
    };
    const b: ThemeDefinition = {
      id: "b",
      label: "B",
      extends: "a",
      color: baseColor,
    };

    expect(() => resolveTheme(a, { a, b })).toThrow(/cycle/i);
  });

  it("throws when a theme extends an unknown parent", () => {
    expect(() =>
      resolveTheme({
        id: "orphan",
        label: "Orphan",
        extends: "missing-parent",
        color: baseColor,
      }),
    ).toThrow(/unknown theme/i);
  });

  it("throws when the resolved theme has no color configuration", () => {
    expect(() =>
      resolveTheme({
        id: "no-color",
        label: "No color",
      }),
    ).toThrow(/no color configuration/i);
  });

  it("resolves custom themes by id", () => {
    const custom: CustomTheme = {
      id: "custom-brand",
      label: "Brand",
      extends: "default" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      color: {
        algorithm: "oklch" as const,
        seeds: {
          neutral: "#111111",
          accent: "#ff00ff",
          success: "#00aa00",
          warning: "#ffaa00",
          danger: "#aa0000",
          info: "#0088ff",
        },
      },
    };

    const resolved = resolveThemeById("custom-brand", [custom]);
    expect(resolved.id).toBe("custom-brand");
    expect(resolved.color?.seeds.accent).toBe("#ff00ff");
  });

  it("resolves custom themes from the registry", () => {
    const custom: ThemeDefinition = {
      id: "custom-test",
      label: "Custom",
      extends: "default",
      color: baseColor,
      radiusFactor: 1.2,
    };

    const resolved = resolveTheme(custom, { "custom-test": custom });
    expect(resolved.radiusFactor).toBe(1.2);
    expect(resolveThemeById("default")).toBeDefined();
  });

  it("throws for unknown theme ids", () => {
    expect(() => resolveThemeById("not-real")).toThrow(/Unknown theme/i);
  });
});
