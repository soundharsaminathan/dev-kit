import { describe, expect, it } from "vitest";
import { generateDefaultThemeSCSS } from "../scss-generation.js";
import { resolveTheme } from "../theme/resolve-theme.js";
import { builtInThemes } from "../themes/index.js";

describe("generateDefaultThemeSCSS branches", () => {
  it("emits radius and font variables when present", () => {
    const css = generateDefaultThemeSCSS(resolveTheme(builtInThemes.default));

    expect(css).toContain("--radius-factor:");
    expect(css).toContain("--font-sans:");
    expect(css).toContain("--font-serif:");
    expect(css).toContain("--font-mono:");
  });

  it("omits optional font variables when fonts are missing", () => {
    const css = generateDefaultThemeSCSS(
      resolveTheme({
        id: "minimal",
        label: "Minimal",
        color: builtInThemes.default.color!,
        radiusFactor: 0.5,
      }),
    );

    expect(css).toContain("--radius-factor:");
    expect(css).not.toContain("--font-sans:");
    expect(css).not.toContain("--font-serif:");
    expect(css).not.toContain("--font-mono:");
  });
});
