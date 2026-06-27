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
import type { ResolvedTheme } from "../types.js";

function minimalTheme(overrides: Partial<ResolvedTheme> = {}): ResolvedTheme {
  return {
    id: "test",
    label: "Test",
    color: {
      algorithm: "oklch",
      seeds: { neutral: "#64748b", accent: "#3b82f6" },
    },
    tokens: {
      foundation: {},
      semantic: {},
      effects: {},
      interaction: {},
      components: {},
    },
    ...overrides,
  };
}

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

  it("omits extra vars when radius and fonts are undefined", () => {
    const css = emitThemeBlock(minimalTheme(), "test", "light");

    expect(css).not.toContain("--radius-factor:");
    expect(css).not.toContain("--font-sans:");
    expect(css).not.toContain("--font-serif:");
    expect(css).not.toContain("--font-mono:");
  });

  it("emits only the font overrides that are defined", () => {
    const sansOnly = emitThemeBlock(
      minimalTheme({ fonts: { sans: "Arial, sans-serif" } }),
      "test",
      "light",
    );
    const serifOnly = emitThemeBlock(
      minimalTheme({ fonts: { serif: "Georgia, serif" } }),
      "test",
      "light",
    );
    const monoOnly = emitThemeBlock(
      minimalTheme({ fonts: { mono: "Menlo, monospace" } }),
      "test",
      "light",
    );

    expect(sansOnly).toContain("--font-sans: Arial, sans-serif;");
    expect(sansOnly).not.toContain("--font-serif:");
    expect(sansOnly).not.toContain("--font-mono:");

    expect(serifOnly).toContain("--font-serif: Georgia, serif;");
    expect(serifOnly).not.toContain("--font-sans:");

    expect(monoOnly).toContain("--font-mono: Menlo, monospace;");
    expect(monoOnly).not.toContain("--font-sans:");
  });

  it("skips token override lines when override vocabularies are empty", () => {
    const css = emitThemeBlock(minimalTheme(), "test", "light");

    expect(css).toContain("--neutral-500:");
    expect(css).not.toContain("--interaction-hover-scale:");
    expect(css).not.toContain("--btn-radius:");
  });

  it("falls back to light per-mode token targets", () => {
    const css = emitThemeBlock(
      minimalTheme({
        tokens: {
          foundation: {},
          semantic: {},
          effects: {},
          interaction: {},
          components: {
            "mode-fallback": {
              target: { light: { value: "light-value" } },
              category: "component",
            },
          },
        },
      }),
      "test",
      "dark",
    );

    expect(css).toContain("--mode-fallback: light-value;");
  });

  it("falls back to the first per-mode token target when light is missing", () => {
    const css = emitThemeBlock(
      minimalTheme({
        tokens: {
          foundation: {},
          semantic: {},
          effects: {},
          interaction: {},
          components: {
            "dark-only": {
              target: { dark: { value: "dark-only-value" } },
              category: "component",
            },
          },
        },
      }),
      "test",
      "light",
    );

    expect(css).toContain("--dark-only: dark-only-value;");
  });

  it("resolves direct semantic targets for token overrides", () => {
    const css = emitThemeBlock(
      minimalTheme({
        tokens: {
          foundation: {},
          semantic: {},
          effects: {},
          interaction: {},
          components: {
            "direct-ref": {
              target: { ref: "accent-500" },
              category: "component",
            },
            "direct-on": {
              target: { onOf: "accent-500" },
              category: "component",
            },
            "direct-mix": {
              target: {
                mix: {
                  space: "oklch",
                  stops: [{ ref: "accent-500" }, 50, { value: "transparent" }],
                },
              },
              category: "component",
            },
          },
        },
      }),
      "test",
      "light",
    );

    expect(css).toContain("--direct-ref: var(--accent-500);");
    expect(css).toContain("--direct-on: var(--on-accent-500);");
    expect(css).toContain("--direct-mix:");
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

  it("builds mode-specific selectors", () => {
    expect(themeSelector("default", "dark")).toBe(
      '[data-theme="default"][data-theme-mode="dark"]',
    );
    expect(themeSelector("custom", "light")).toContain('[data-theme="custom"]');
    expect(themeSelector("custom", "dark")).toContain(
      '[data-theme-mode="dark"]',
    );
  });
});
