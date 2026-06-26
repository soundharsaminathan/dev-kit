import { describe, expect, it } from "vitest";
import { resolveTheme } from "../theme/resolve-theme.js";
import {
  emitThemeBlock,
  getAllSemanticVocabulary,
  themeSelector,
  themeToCss,
} from "../theme/theme-to-css.js";
import { glassmorphismTheme } from "../themes/glassmorphism.js";
import { materialTheme } from "../themes/material.js";
import { neumorphismTheme } from "../themes/neumorphism.js";
import { DEFAULT_TOKEN_TREE } from "../tokens/index.js";

describe("theme-to-css branches", () => {
  it("builds mode-specific selectors", () => {
    expect(themeSelector("custom", "light")).toContain('[data-theme="custom"]');
    expect(themeSelector("custom", "dark")).toContain(
      '[data-theme-mode="dark"]',
    );
  });

  it("includes semantic vocabulary entries in generated css", () => {
    const css = themeToCss(resolveTheme(glassmorphismTheme), "glassmorphism");
    const vocabulary = getAllSemanticVocabulary();

    expect(Object.keys(vocabulary).length).toBeGreaterThan(0);
    expect(css).toContain("--neutral-500:");
  });

  it("emits font and radius overrides for themes that define them", () => {
    const css = themeToCss(
      resolveTheme({
        ...materialTheme,
        radiusFactor: 1.1,
        fonts: {
          sans: "Inter, sans-serif",
          serif: "Georgia, serif",
          mono: "Menlo, monospace",
        },
      }),
      "material",
    );

    expect(css).toContain("--radius-factor:");
    expect(css).toContain("--font-sans:");
    expect(css).toContain("--font-serif:");
    expect(css).toContain("--font-mono:");
  });

  it("includes component override lines when present", () => {
    const css = emitThemeBlock(
      resolveTheme(materialTheme),
      "material",
      "light",
    );

    expect(css).toContain("--interaction-hover-scale:");
  });

  it("resolves per-mode component overrides", () => {
    const css = emitThemeBlock(
      resolveTheme(neumorphismTheme),
      "neumorphism",
      "dark",
    );

    expect(css).toContain("--neumo-depth:");
  });

  it("throws for themes without color configuration in emitThemeBlock", () => {
    expect(() =>
      emitThemeBlock(
        {
          id: "empty",
          label: "Empty",
          color: undefined as never,
          tokens: DEFAULT_TOKEN_TREE,
        },
        "empty",
        "dark",
      ),
    ).toThrow(/no color configuration/i);
  });
});
