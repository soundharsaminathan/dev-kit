import { describe, expect, it } from "vitest";
import { COLOR_SWATCH_PICKER_PRESETS } from "../preset-colors";

describe("COLOR_SWATCH_PICKER_PRESETS", () => {
  it("exports preset swatch colors", () => {
    expect(COLOR_SWATCH_PICKER_PRESETS).toHaveLength(6);
    expect(COLOR_SWATCH_PICKER_PRESETS[0]).toBe("#6366f1");
  });
});
