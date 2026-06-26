import { describe, expect, it } from "vitest";
import {
  getSemanticColor,
  resolveSemanticColors,
} from "../theme/resolve-semantic-colors.js";
import { builtInThemes } from "../themes/index.js";

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

  it("throws when a theme has no color configuration", () => {
    expect(() =>
      resolveSemanticColors({ id: "empty", label: "Empty" }, "light"),
    ).toThrow('Theme "empty" has no color configuration');
  });

  it("returns undefined for unknown semantic tokens", () => {
    expect(
      getSemanticColor(builtInThemes.default, "light", "not-a-token"),
    ).toBeUndefined();
  });

  it("resolves on-color tokens from ramp references", () => {
    const colors = resolveSemanticColors(builtInThemes.default, "light");

    expect(colors["color-fg-on-primary"]).toMatch(/black|white/);
    expect(colors["color-fg-on-highlight"]).toMatch(/black|white/);
  });
});
