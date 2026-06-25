import type { ThemeDefinition } from "../types.js";
import { auroraTheme } from "./aurora.js";
import { defaultTheme } from "./default.js";
import { glassmorphismTheme } from "./glassmorphism.js";
import { materialTheme } from "./material.js";
import { neoBrutalismTheme } from "./neo-brutalism.js";
import { neumorphismTheme } from "./neumorphism.js";
import { terminalTheme } from "./terminal.js";

export { auroraTheme } from "./aurora.js";
export { defaultTheme } from "./default.js";
export { glassmorphismTheme, glassTheme } from "./glassmorphism.js";
export { materialTheme } from "./material.js";
export { neoBrutalismTheme } from "./neo-brutalism.js";
export { neumorphismTheme } from "./neumorphism.js";
export { terminalTheme } from "./terminal.js";

export const builtInThemes = {
  default: defaultTheme,
  material: materialTheme,
  glassmorphism: glassmorphismTheme,
  neumorphism: neumorphismTheme,
  "neo-brutalism": neoBrutalismTheme,
  aurora: auroraTheme,
  terminal: terminalTheme,
} as const satisfies Record<string, ThemeDefinition>;

export type BuiltInThemeId = keyof typeof builtInThemes;

const THEME_ALIASES: Record<string, BuiltInThemeId> = {
  glass: "glassmorphism",
  skeuomorphism: "default",
};

export function normalizeThemeId(themeId: string): string {
  return THEME_ALIASES[themeId] ?? themeId;
}

export function getBuiltInThemes(): ThemeDefinition[] {
  return Object.values(builtInThemes);
}

export function getBuiltInThemeIds(): BuiltInThemeId[] {
  return Object.keys(builtInThemes) as BuiltInThemeId[];
}

export function getBuiltInTheme(id: string): ThemeDefinition | undefined {
  return builtInThemes[normalizeThemeId(id) as BuiltInThemeId];
}

export function isBuiltInTheme(id: string): id is BuiltInThemeId {
  return normalizeThemeId(id) in builtInThemes;
}
