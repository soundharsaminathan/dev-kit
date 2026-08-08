import { describe, expect, it } from "vitest";
import {
  getSemanticColor,
  resolveSemanticColors,
} from "../theme/resolve-semantic-colors.js";
import type { TokenVocabulary } from "../theme/types.js";
import { builtInThemes } from "../themes/index.js";

const testSemantics = {
  "test-value": {
    target: { value: "#ff0000" },
    category: "background",
  },
  "test-invalid-ref": {
    target: { ref: "not-a-ramp" },
    category: "background",
  },
  "test-on-color": {
    target: { onOf: "neutral-500" },
    category: "foreground",
  },
  "test-per-mode": {
    target: {
      light: { ref: "neutral-50" },
      dark: { ref: "neutral-900" },
    },
    category: "background",
  },
} satisfies TokenVocabulary;

describe("resolve-semantic-colors", () => {
  it("resolves semantic colors for a built-in theme", () => {
    const light = resolveSemanticColors(builtInThemes.default, "light");
    const dark = resolveSemanticColors(builtInThemes.default, "dark");

    expect(light["color-bg"]).toContain("oklch(");
    expect(dark["color-bg"]).toContain("oklch(");
    expect(getSemanticColor(builtInThemes.default, "light", "color-bg")).toBe(
      light["color-bg"],
    );
  });

  it("resolves literal, per-mode, on-color, and invalid refs", () => {
    const light = resolveSemanticColors(
      builtInThemes.default,
      "light",
      testSemantics,
    );
    const dark = resolveSemanticColors(
      builtInThemes.default,
      "dark",
      testSemantics,
    );

    expect(light["test-value"]).toBe("#ff0000");
    expect(light["test-invalid-ref"]).toBeUndefined();
    expect(light["test-on-color"]).toMatch(/black|white/);
    expect(light["test-per-mode"]).toContain("oklch(");
    expect(dark["test-per-mode"]).toContain("oklch(");
    expect(dark["test-per-mode"]).not.toBe(light["test-per-mode"]);
  });

  it("throws when a theme has no color configuration", () => {
    expect(() =>
      resolveSemanticColors({ id: "empty", label: "Empty" }, "light"),
    ).toThrow('Theme "empty" has no color configuration');

    expect(() =>
      resolveSemanticColors(
        { id: "empty", label: "Empty" },
        "light",
        testSemantics,
      ),
    ).toThrow(/no color configuration/i);
  });

  it("falls back to light mode for per-mode targets", () => {
    const colors = resolveSemanticColors(builtInThemes.default, "dark", {
      "dark-only-missing-light": {
        target: { dark: { ref: "neutral-900" } },
        category: "background",
      },
    } satisfies TokenVocabulary);

    expect(colors["dark-only-missing-light"]).toContain("oklch(");
  });

  it("returns undefined for mix targets, which are not yet supported", () => {
    const colors = resolveSemanticColors(builtInThemes.default, "light", {
      "test-mix": {
        target: {
          mix: {
            space: "oklch",
            stops: [{ ref: "neutral-50" }, 50, { value: "transparent" }],
          },
        },
        category: "background",
      },
    } satisfies TokenVocabulary);

    expect(colors["test-mix"]).toBeUndefined();
  });

  it("returns undefined for unknown semantic tokens", () => {
    expect(
      getSemanticColor(builtInThemes.default, "light", "not-a-token"),
    ).toBeUndefined();
    expect(
      getSemanticColor(builtInThemes.default, "light", "missing-token"),
    ).toBeUndefined();
  });

  it("resolves on-color tokens from ramp references", () => {
    const colors = resolveSemanticColors(builtInThemes.default, "light");

    expect(colors["color-fg-on-primary"]).toMatch(/black|white/);
    expect(colors["color-fg-on-highlight"]).toMatch(/black|white/);
  });

  it("returns individual semantic colors by name", () => {
    expect(
      getSemanticColor(builtInThemes.default, "light", "color-bg"),
    ).toContain("oklch(");
  });
});
