import { describe, expect, it } from "vitest";
import { formatThemeLabel } from "../format-theme-label";

describe("formatThemeLabel", () => {
  it("title-cases hyphenated theme ids", () => {
    expect(formatThemeLabel("neo-brutalism")).toBe("Neo Brutalism");
  });

  it("uses provided label when available", () => {
    expect(formatThemeLabel("glass", "Glassmorphism")).toBe("Glassmorphism");
  });
});
