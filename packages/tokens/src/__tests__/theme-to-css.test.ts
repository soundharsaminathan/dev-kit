import { describe, expect, it } from "vitest";
import { resolveTheme } from "../theme/resolve-theme.js";
import {
  emitThemeBlock,
  getAllSemanticVocabulary,
  themeSelector,
  themeToCss,
} from "../theme/theme-to-css.js";
import { glassmorphismTheme } from "../themes/glassmorphism.js";
import { neumorphismTheme } from "../themes/neumorphism.js";
import { DEFAULT_TOKEN_TREE } from "../tokens/index.js";

describe("emitThemeBlock", () => {
  it("emits mode-specific token overrides", () => {
    const theme = resolveTheme(glassmorphismTheme);
    const light = emitThemeBlock(theme, "glassmorphism", "light");
    const dark = emitThemeBlock(theme, "glassmorphism", "dark");

    expect(light).toContain("rgb(255 255 255 / 0.3)");
    expect(dark).toContain("rgb(255 255 255 / 0.18)");
    expect(light).not.toContain("rgb(255 255 255 / 0.18)");
  });

  it("emits per-mode component overrides", () => {
    const theme = resolveTheme(neumorphismTheme);
    const light = emitThemeBlock(theme, "neumorphism", "light");
    const dark = emitThemeBlock(theme, "neumorphism", "dark");

    expect(light).toContain("--neumo-depth: 10px;");
    expect(dark).toContain("--neumo-depth: 6px;");
  });

  it("throws when a theme has no color configuration", () => {
    expect(() =>
      emitThemeBlock(
        {
          id: "empty",
          label: "Empty",
          color: undefined as never,
          tokens: DEFAULT_TOKEN_TREE,
        },
        "empty",
        "light",
      ),
    ).toThrow(/no color configuration/i);
  });
});

describe("themeToCss", () => {
  it("serializes a resolved theme to css", () => {
    const theme = resolveTheme(glassmorphismTheme);
    const css = themeToCss(theme, "glassmorphism");

    expect(css).toContain('[data-theme="glassmorphism"]');
    expect(getAllSemanticVocabulary()["color-bg"]).toBeDefined();
    expect(css).toContain("--neutral-500:");
    expect(css).toContain("--modal-background:");
  });

  it("builds mode-specific selectors", () => {
    expect(themeSelector("default", "dark")).toBe(
      '[data-theme="default"][data-theme-mode="dark"]',
    );
  });
});
