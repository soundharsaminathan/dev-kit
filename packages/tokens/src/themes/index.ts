import type { ThemeDefinition } from "../types.js";
import { defaultTheme } from "./default.js";
import { glassTheme } from "./glass.js";
import { materialTheme } from "./material.js";

export { defaultTheme } from "./default.js";
export { glassTheme } from "./glass.js";
export { materialTheme } from "./material.js";

export const builtInThemes = {
  default: defaultTheme,
  material: materialTheme,
  glass: glassTheme,
} as const;

export type BuiltInThemeId = keyof typeof builtInThemes;

export function getBuiltInThemes(): ThemeDefinition[] {
  return Object.values(builtInThemes);
}

export function getBuiltInThemeIds(): BuiltInThemeId[] {
  return Object.keys(builtInThemes) as BuiltInThemeId[];
}

export function getBuiltInTheme(id: string): ThemeDefinition | undefined {
  return builtInThemes[id as BuiltInThemeId];
}

export function isBuiltInTheme(id: string): id is BuiltInThemeId {
  return id in builtInThemes;
}
