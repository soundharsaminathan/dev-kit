import { describe, expect, it } from "vitest";
import { resolveSemanticColors } from "../theme/resolve-semantic-colors.js";
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

describe("resolve-semantic-colors branches", () => {
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
});
