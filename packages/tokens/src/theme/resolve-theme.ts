import { builtInThemes, getBuiltInTheme } from "../themes/index.js";
import {
  DEFAULT_TOKEN_TREE,
  type DeepPartial,
  deepMergeTokenTree,
  type TokenTree,
} from "../tokens/index.js";
import type { CustomTheme, ResolvedTheme, ThemeDefinition } from "../types.js";

function mergeThemeDefinitions(
  base: Partial<ThemeDefinition>,
  override: ThemeDefinition,
): ThemeDefinition {
  const merged: ThemeDefinition = {
    id: override.id,
    label: override.label,
    fonts: { ...base.fonts, ...override.fonts },
    tokens: deepMergeTokenTree(
      deepMergeTokenTree(
        DEFAULT_TOKEN_TREE,
        base.tokens as DeepPartial<TokenTree> | undefined,
      ),
      override.tokens,
    ) as unknown as DeepPartial<TokenTree>,
  };
  const color = override.color ?? base.color;
  if (color !== undefined) merged.color = color;
  const radiusFactor = override.radiusFactor ?? base.radiusFactor;
  if (radiusFactor !== undefined) merged.radiusFactor = radiusFactor;
  if (override.extends !== undefined) merged.extends = override.extends;
  else if (base.extends !== undefined) merged.extends = base.extends;
  return merged;
}

function resolveThemeChain(
  theme: ThemeDefinition,
  registry: Record<string, ThemeDefinition>,
): ThemeDefinition[] {
  const chain: ThemeDefinition[] = [];
  const visited = new Set<string>();
  let current: ThemeDefinition | undefined = theme;

  while (current) {
    if (visited.has(current.id)) {
      throw new Error(`Theme inheritance cycle detected at "${current.id}"`);
    }
    visited.add(current.id);
    chain.unshift(current);
    if (!current.extends) break;
    const parent: ThemeDefinition | undefined =
      registry[current.extends] ?? getBuiltInTheme(current.extends);
    if (!parent) {
      throw new Error(
        `Theme "${current.id}" extends unknown theme "${current.extends}"`,
      );
    }
    current = parent;
  }

  return chain;
}

export function resolveTheme(
  theme: ThemeDefinition,
  customRegistry: Record<string, ThemeDefinition> = {},
): ResolvedTheme {
  const registry: Record<string, ThemeDefinition> = {
    ...builtInThemes,
    ...customRegistry,
  };

  const chain = resolveThemeChain(theme, registry);
  const merged = chain.reduce<Partial<ThemeDefinition>>(
    (acc, item) => mergeThemeDefinitions(acc, item),
    {},
  ) as ThemeDefinition;

  if (!merged.color) {
    throw new Error(`Theme "${merged.id}" has no color configuration`);
  }

  return {
    ...merged,
    color: merged.color,
    tokens: deepMergeTokenTree(
      DEFAULT_TOKEN_TREE,
      merged.tokens as DeepPartial<TokenTree>,
    ),
  };
}

export function resolveThemeById(
  themeId: string,
  customThemes: CustomTheme[] = [],
): ResolvedTheme {
  const customRegistry = Object.fromEntries(
    customThemes.map((theme) => [theme.id, theme]),
  );
  const builtIn = getBuiltInTheme(themeId);
  if (builtIn) {
    return resolveTheme(builtIn, customRegistry);
  }
  const custom = customRegistry[themeId];
  if (!custom) {
    throw new Error(`Unknown theme "${themeId}"`);
  }
  return resolveTheme(custom, customRegistry);
}
