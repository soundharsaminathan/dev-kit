import { describe, expect, it } from "vitest";
import { DEFAULT_COLOR_CONFIG } from "../theme/color-config.js";
import {
  emitPrimitivesBlock,
  resolveColorConfig,
} from "../theme/primitives.js";

describe("primitives", () => {
  it("resolves supported generative color configs", () => {
    const resolved = resolveColorConfig(DEFAULT_COLOR_CONFIG);
    expect(resolved.light.accent?.["500"]).toContain("oklch(");
  });

  it("rejects unsupported color algorithms", () => {
    expect(() =>
      resolveColorConfig({
        algorithm: "unsupported" as "oklch",
        seeds: DEFAULT_COLOR_CONFIG.seeds,
      }),
    ).toThrow(/not a seed-generative algorithm/);
  });

  it("emits primitive blocks with extra vars and without on-colors", () => {
    const resolved = resolveColorConfig(DEFAULT_COLOR_CONFIG);
    const css = emitPrimitivesBlock({
      selector: ":root",
      resolved,
      mode: "dark",
      onColors: false,
      extraVars: { "font-sans": "Inter" },
      includeRadiusFactor: true,
    });

    expect(css).toContain("--radius-factor: 1;");
    expect(css).toContain("--font-sans: Inter;");
    expect(css).not.toContain("--on-neutral-500:");
  });

  it("emits on-color variables when enabled", () => {
    const resolved = resolveColorConfig(DEFAULT_COLOR_CONFIG);
    const css = emitPrimitivesBlock({
      selector: ":root",
      resolved,
      mode: "light",
      onColors: true,
    });

    expect(css).toContain("--on-neutral-500:");
  });
});
