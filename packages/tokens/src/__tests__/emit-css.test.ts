import { describe, expect, it } from "vitest";
import { emitCss, resolveTarget } from "../theme/emit-css.js";

describe("resolveTarget", () => {
  it("resolves ref targets", () => {
    expect(resolveTarget({ ref: "neutral-500" })).toBe("var(--neutral-500)");
  });

  it("resolves onOf targets", () => {
    expect(resolveTarget({ onOf: "accent-500" })).toBe("var(--on-accent-500)");
  });

  it("resolves literal values", () => {
    expect(resolveTarget({ value: "0.875rem" })).toBe("0.875rem");
  });

  it("resolves mix targets", () => {
    expect(
      resolveTarget({
        mix: {
          space: "oklch",
          stops: [{ ref: "color-bg" }, 50, { value: "transparent" }],
        },
      }),
    ).toBe("color-mix(in oklch, var(--color-bg) 50%, transparent)");
  });
});

describe("emitCss", () => {
  it("emits css variables for a vocabulary", () => {
    const css = emitCss(
      {
        "space-1": {
          target: { value: "0.25rem" },
          category: "foundation",
        },
      },
      { selector: ":root" },
    );

    expect(css).toContain(":root {");
    expect(css).toContain("--space-1: 0.25rem;");
  });

  it("uses light mode targets for per-mode tokens", () => {
    const css = emitCss({
      "color-bg": {
        target: {
          light: { value: "#ffffff" },
          dark: { value: "#000000" },
        },
        category: "background",
      },
    });

    expect(css).toContain("--color-bg: #ffffff;");
    expect(css).not.toContain("#000000");
  });

  it("falls back to the first mode when light is missing", () => {
    const css = emitCss({
      "color-accent-only-dark": {
        target: {
          dark: { value: "#111111" },
        },
        category: "background",
      },
    });

    expect(css).toContain("--color-accent-only-dark: #111111;");
  });
});
