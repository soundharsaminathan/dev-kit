/**
 * Theme preset registry
 * Export all available theme presets here
 */

import { catppuccin } from "./catppuccin";
import { modernMinimal } from "./modern-minimal";
import { violetBloom } from "./violet-bloom";

export { catppuccin, modernMinimal, violetBloom };

/**
 * Registry of all theme presets
 * Used for type safety and runtime theme selection
 */
export const themePresets = {
  "modern-minimal": modernMinimal,
  "violet-bloom": violetBloom,
  catppuccin: catppuccin,
} as const;

/**
 * Type helper for theme preset names
 */
export type ThemePresetName = keyof typeof themePresets;

/**
 * Get all available theme preset names
 */
export const getThemePresetNames = (): ThemePresetName[] => {
  return Object.keys(themePresets) as ThemePresetName[];
};

/**
 * Get a theme preset by name
 */
export const getThemePreset = (
  name: ThemePresetName,
): (typeof themePresets)[ThemePresetName] => {
  return themePresets[name];
};
