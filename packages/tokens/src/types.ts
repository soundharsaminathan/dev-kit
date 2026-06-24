import type { ColorConfig } from "./theme/color-config.js";
import type { DeepPartial, TokenTree } from "./tokens/index.js";

export interface ThemeFonts {
  sans?: string;
  serif?: string;
  mono?: string;
}

export type ThemeMode = "light" | "dark";

export interface ThemeDefinition {
  id: string;
  label: string;
  extends?: string;
  color?: ColorConfig;
  radiusFactor?: number;
  fonts?: ThemeFonts;
  tokens?: DeepPartial<TokenTree>;
}

export interface CustomTheme extends ThemeDefinition {
  id: `custom-${string}`;
  createdAt: string;
}

export interface ResolvedTheme
  extends Omit<ThemeDefinition, "color" | "tokens"> {
  color: ColorConfig;
  tokens: TokenTree;
}

export const CUSTOM_THEMES_STORAGE_KEY = "dev-ui-custom-themes";
export const ACTIVE_THEME_STORAGE_KEY = "dev-ui-theme";
export const THEME_MODE_STORAGE_KEY = "dev-ui-theme-mode";
export const MAX_CUSTOM_THEMES = 10;

/** @deprecated Use ThemeDefinition */
export type ThemePreset = ThemeDefinition;

/** @deprecated Use ThemeDefinition id */
export type ThemePresetName = string;
