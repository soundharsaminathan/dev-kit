import { describe, expect, it } from "vitest";
import {
  ACTIVE_THEME_STORAGE_KEY,
  CUSTOM_THEMES_STORAGE_KEY,
  MAX_CUSTOM_THEMES,
  THEME_MODE_STORAGE_KEY,
} from "../types.js";

describe("types", () => {
  it("exports storage keys and limits", () => {
    expect(CUSTOM_THEMES_STORAGE_KEY).toBe("dev-ui-custom-themes");
    expect(ACTIVE_THEME_STORAGE_KEY).toBe("dev-ui-theme");
    expect(THEME_MODE_STORAGE_KEY).toBe("dev-ui-theme-mode");
    expect(MAX_CUSTOM_THEMES).toBe(10);
  });
});
