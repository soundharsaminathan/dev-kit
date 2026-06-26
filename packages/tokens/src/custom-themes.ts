import type { CustomTheme } from "./types.js";
import { CUSTOM_THEMES_STORAGE_KEY, MAX_CUSTOM_THEMES } from "./types.js";

export function createCustomThemeId(): `custom-${string}` {
  return `custom-${crypto.randomUUID()}`;
}

export function parseCustomThemes(raw: string | null): CustomTheme[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomTheme =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as CustomTheme).id === "string" &&
        (item as CustomTheme).id.startsWith("custom-"),
    );
  } catch {
    return [];
  }
}

export function loadCustomThemes(
  storage: Pick<Storage, "getItem"> = globalThis.localStorage,
): CustomTheme[] {
  return parseCustomThemes(storage.getItem(CUSTOM_THEMES_STORAGE_KEY));
}

export function saveCustomThemes(
  themes: CustomTheme[],
  storage: Pick<Storage, "setItem"> = globalThis.localStorage,
): void {
  storage.setItem(
    CUSTOM_THEMES_STORAGE_KEY,
    JSON.stringify(themes.slice(0, MAX_CUSTOM_THEMES)),
  );
}
