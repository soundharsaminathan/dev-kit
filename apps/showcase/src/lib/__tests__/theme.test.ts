import { describe, expect, it } from "vitest";
import { formatPresetLabel } from "../theme";

describe("formatPresetLabel", () => {
  it("title-cases hyphenated preset names", () => {
    expect(formatPresetLabel("modern-minimal")).toBe("Modern Minimal");
  });

  it("handles single-word presets", () => {
    expect(formatPresetLabel("catppuccin")).toBe("Catppuccin");
  });
});
