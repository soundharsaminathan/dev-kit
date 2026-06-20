import type { ColorConfig } from "./theme/color-config.js";

export interface ThemeFonts {
  sans?: string;
  serif?: string;
  mono?: string;
}

export interface ThemePreset {
  label: string;
  createdAt?: string;
  /** Seed-based color recipe — generates primitive ramps at build time. */
  color: ColorConfig;
  /** Global radius multiplier (`--radius-factor`). */
  radiusFactor?: number;
  fonts?: ThemeFonts;
}

export type ThemePresetName = string;

export type ThemeMode = "light" | "dark";
