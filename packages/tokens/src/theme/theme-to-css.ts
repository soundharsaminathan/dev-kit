import { mergeVocabularies } from "../tokens/index.js";
import { DEFAULT_EXTENDED_SEMANTICS } from "../tokens/semantic.js";
import type { ResolvedTheme, ThemeMode } from "../types.js";
import { resolveTarget } from "./emit-css.js";
import { emitPrimitivesBlock, resolveColorConfig } from "./primitives.js";
import { DEFAULT_SEMANTICS } from "./semantics.js";
import type { SemanticTarget, TokenDefinition } from "./types.js";

function themeExtraVars(theme: ResolvedTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  if (theme.radiusFactor !== undefined) {
    vars["radius-factor"] = String(theme.radiusFactor);
  }
  if (theme.fonts?.sans) vars["font-sans"] = theme.fonts.sans;
  if (theme.fonts?.serif) vars["font-serif"] = theme.fonts.serif;
  if (theme.fonts?.mono) vars["font-mono"] = theme.fonts.mono;
  return vars;
}

function resolveTokenTarget(
  target: TokenDefinition["target"],
  mode: ThemeMode,
): SemanticTarget {
  if (
    "ref" in target ||
    "onOf" in target ||
    "value" in target ||
    "mix" in target
  ) {
    return target as SemanticTarget;
  }
  const perMode = target as Record<string, SemanticTarget>;
  return (
    perMode[mode] ??
    perMode.light ??
    (Object.values(perMode)[0] as SemanticTarget)
  );
}

function themeTokenOverrideLines(
  theme: ResolvedTheme,
  mode: ThemeMode,
): string[] {
  const merged = mergeVocabularies(
    theme.tokens.semantic,
    theme.tokens.effects,
    theme.tokens.interaction,
    theme.tokens.components,
  );
  const lines: string[] = [];
  for (const [name, token] of Object.entries(merged)) {
    lines.push(
      `  --${name}: ${resolveTarget(resolveTokenTarget(token.target, mode))};`,
    );
  }
  return lines;
}

export const THEME_SCOPE_SELECTOR = "[data-theme][data-theme-mode]";

export function themeSelector(themeId: string, mode: ThemeMode): string {
  return `[data-theme="${themeId}"][data-theme-mode="${mode}"]`;
}

export function emitThemeBlock(
  theme: ResolvedTheme,
  themeId: string,
  mode: ThemeMode,
): string {
  if (!theme.color) {
    throw new Error(`Theme "${themeId}" has no color configuration`);
  }

  const resolved = resolveColorConfig(theme.color);
  const selector = themeSelector(themeId, mode);
  const lines: string[] = [`${selector} {`];

  const primitives = emitPrimitivesBlock({
    selector: "__placeholder__",
    resolved,
    mode,
    extraVars: themeExtraVars(theme),
  });
  for (const line of primitives.split("\n")) {
    if (line.startsWith("  --")) lines.push(line);
  }

  const overrideLines = themeTokenOverrideLines(theme, mode);
  if (overrideLines.length > 0) {
    lines.push(...overrideLines);
  }

  lines.push("}");
  return lines.join("\n");
}

export function themeToCss(theme: ResolvedTheme, themeId: string): string {
  const light = emitThemeBlock(theme, themeId, "light");
  const dark = emitThemeBlock(theme, themeId, "dark");
  return `${light}\n\n${dark}`;
}

export function getAllSemanticVocabulary() {
  return mergeVocabularies(DEFAULT_SEMANTICS, DEFAULT_EXTENDED_SEMANTICS);
}
