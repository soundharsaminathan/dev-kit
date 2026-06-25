import { describe, expect, it } from "vitest";
import { resolveTheme } from "../theme/resolve-theme.js";
import { emitThemeBlock } from "../theme/theme-to-css.js";
import { glassmorphismTheme } from "../themes/glassmorphism.js";

describe("emitThemeBlock", () => {
  it("emits mode-specific token overrides", () => {
    const theme = resolveTheme(glassmorphismTheme);
    const light = emitThemeBlock(theme, "glassmorphism", "light");
    const dark = emitThemeBlock(theme, "glassmorphism", "dark");

    expect(light).toContain("rgb(255 255 255 / 0.3)");
    expect(dark).toContain("rgb(255 255 255 / 0.18)");
    expect(light).not.toContain("rgb(255 255 255 / 0.18)");
  });
});
