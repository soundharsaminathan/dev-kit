import { describe, expect, it, vi } from "vitest";
import {
  createCustomThemeId,
  loadCustomThemes,
  parseCustomThemes,
  saveCustomThemes,
} from "../custom-themes.js";
import { CUSTOM_THEMES_STORAGE_KEY, MAX_CUSTOM_THEMES } from "../types.js";

describe("custom-themes", () => {
  it("creates custom theme ids", () => {
    expect(createCustomThemeId()).toMatch(/^custom-/);
  });

  it("parses valid custom themes from storage", () => {
    const themes = parseCustomThemes(
      JSON.stringify([
        {
          id: "custom-1",
          label: "One",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        { id: "built-in", label: "Skip" },
        null,
      ]),
    );

    expect(themes).toEqual([
      {
        id: "custom-1",
        label: "One",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list for invalid storage payloads", () => {
    expect(parseCustomThemes(null)).toEqual([]);
    expect(parseCustomThemes("not-json")).toEqual([]);
    expect(parseCustomThemes(JSON.stringify({ not: "array" }))).toEqual([]);
  });

  it("loads and saves custom themes", () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };

    expect(loadCustomThemes(storage)).toEqual([]);

    const themes = Array.from(
      { length: MAX_CUSTOM_THEMES + 2 },
      (_, index) => ({
        id: `custom-${index}` as const,
        label: `Theme ${index}`,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    saveCustomThemes(themes, storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      CUSTOM_THEMES_STORAGE_KEY,
      JSON.stringify(themes.slice(0, MAX_CUSTOM_THEMES)),
    );
  });
});
