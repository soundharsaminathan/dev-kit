import { describe, expect, it } from "vitest";
import { resolveTheme, resolveThemeById } from "../theme/resolve-theme.js";
import { builtInThemes } from "../themes/index.js";
import type { ThemeDefinition } from "../types.js";

const baseColor = builtInThemes.default.color!;

describe("resolve-theme branches", () => {
  it("throws when a theme extends an unknown parent", () => {
    expect(() =>
      resolveTheme({
        id: "orphan",
        label: "Orphan",
        extends: "missing-parent",
        color: baseColor,
      }),
    ).toThrow(/extends unknown theme/i);
  });

  it("throws when theme inheritance cycles", () => {
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

    expect(() => resolveTheme(a, { a, b })).toThrow(/cycle detected/i);
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

  it("inherits extends from the base theme when override omits it", () => {
    const resolved = resolveTheme({
      id: "child",
      label: "Child",
      color: baseColor,
    });

    expect(resolved.id).toBe("child");
    expect(resolved.color?.seeds.neutral).toBeDefined();
  });

  it("throws when the resolved theme has no color configuration", () => {
    expect(() =>
      resolveTheme({
        id: "no-color",
        label: "No color",
      }),
    ).toThrow(/no color configuration/i);
  });
});
