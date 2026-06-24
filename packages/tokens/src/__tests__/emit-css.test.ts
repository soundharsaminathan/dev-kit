import { describe, expect, it } from "vitest";
import { resolveTarget } from "../theme/emit-css.js";

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
