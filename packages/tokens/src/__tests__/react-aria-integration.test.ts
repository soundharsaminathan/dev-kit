import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAriaColorScheme,
  getAriaThemeConfig,
  themeTokensToAriaColors,
} from "../react-aria-integration.js";
import * as semanticColors from "../theme/resolve-semantic-colors.js";

describe("react-aria-integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps theme tokens to aria colors", () => {
    const colors = themeTokensToAriaColors("default", "light");

    expect(colors.background).toBeDefined();
    expect(colors.foreground).toBeDefined();
    expect(colors.button?.background).toBeDefined();
  });

  it("omits undefined semantic colors", () => {
    vi.spyOn(semanticColors, "getSemanticColor").mockImplementation(
      (_theme, _mode, token) => {
        if (
          token === "color-muted" ||
          token === "color-fg-disabled" ||
          token === "color-border-hover" ||
          token === "color-primary-hover"
        ) {
          return undefined;
        }
        return "oklch(0.5 0 0)";
      },
    );

    const colors = themeTokensToAriaColors("default", "light");

    expect(colors.background).toBeDefined();
    expect(colors.backgroundHover).toBeUndefined();
    expect(colors.foregroundDisabled).toBeUndefined();
    expect(colors.borderHover).toBeUndefined();
    expect(colors.button?.backgroundHover).toBeUndefined();
  });

  it("returns an empty palette when no semantic colors resolve", () => {
    vi.spyOn(semanticColors, "getSemanticColor").mockReturnValue(undefined);

    expect(themeTokensToAriaColors("default", "light")).toEqual({});
  });

  it("returns aria theme config", () => {
    expect(getAriaColorScheme("dark")).toBe("dark");
    expect(getAriaThemeConfig("default", "light")).toEqual({
      colorScheme: "light",
      theme: expect.objectContaining({
        background: expect.any(String),
      }),
    });
  });
});
