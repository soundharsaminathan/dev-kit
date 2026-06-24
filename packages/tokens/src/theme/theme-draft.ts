import {
  DEFAULT_TOKEN_TREE,
  type DeepPartial,
  deepMergeTokenTree,
  type TokenTree,
} from "../tokens/index.js";
import type { ResolvedTheme, ThemeDefinition } from "../types.js";
import type { ColorConfig } from "./color-config.js";
import { DEFAULT_COLOR_CONFIG } from "./color-config.js";
import { resolveTarget } from "./emit-css.js";
import { resolveTheme } from "./resolve-theme.js";
import type {
  SemanticTarget,
  TokenDefinition,
  TokenVocabulary,
} from "./types.js";

export type TokenLayerKey = keyof TokenTree;

export const TOKEN_LAYER_LABELS: Record<TokenLayerKey, string> = {
  foundation: "Foundation",
  semantic: "Semantic",
  effects: "Effects",
  interaction: "Interaction",
  components: "Components",
};

export const TOKEN_LAYER_ORDER: TokenLayerKey[] = [
  "foundation",
  "semantic",
  "effects",
  "interaction",
  "components",
];

export interface ThemeDraft {
  label: string;
  extends: string;
  color: ColorConfig;
  radiusFactor?: number;
  tokenOverrides: DeepPartial<TokenTree>;
}

export interface EditableToken {
  name: string;
  layer: TokenLayerKey;
  cssValue: string;
  category: TokenDefinition["category"];
  isOverride: boolean;
  overrideValue?: string;
}

function resolveTokenTarget(target: TokenDefinition["target"]): SemanticTarget {
  if (
    "ref" in target ||
    "onOf" in target ||
    "value" in target ||
    "mix" in target
  ) {
    return target as SemanticTarget;
  }
  const perMode = target as Record<string, SemanticTarget>;
  return perMode.light ?? (Object.values(perMode)[0] as SemanticTarget);
}

function getOverrideValue(
  overrides: DeepPartial<TokenTree>,
  layer: TokenLayerKey,
  name: string,
): string | undefined {
  const token = overrides[layer]?.[name as keyof TokenVocabulary] as
    | TokenDefinition
    | undefined;
  if (!token) return undefined;
  const target = resolveTokenTarget(token.target);
  if ("value" in target) return target.value;
  return resolveTarget(target);
}

export function createThemeDraft(
  options: Partial<ThemeDraft> & { extends?: string } = {},
): ThemeDraft {
  const draft: ThemeDraft = {
    label: options.label ?? "My theme",
    extends: options.extends ?? "default",
    color: options.color ?? {
      algorithm: "oklch",
      seeds: { ...DEFAULT_COLOR_CONFIG.seeds },
    },
    tokenOverrides: options.tokenOverrides ?? {},
  };
  if (options.radiusFactor !== undefined) {
    draft.radiusFactor = options.radiusFactor;
  }
  return draft;
}

export function themeDraftToDefinition(
  draft: ThemeDraft,
  id = "draft",
): ThemeDefinition {
  const definition: ThemeDefinition = {
    id,
    label: draft.label,
    extends: draft.extends,
    color: draft.color,
    tokens: draft.tokenOverrides,
  };
  if (draft.radiusFactor !== undefined) {
    definition.radiusFactor = draft.radiusFactor;
  }
  return definition;
}

export function definitionToThemeDraft(
  definition: ThemeDefinition,
): ThemeDraft {
  const draft = createThemeDraft({
    label: definition.label,
    extends: definition.extends ?? "default",
    color: definition.color ?? {
      algorithm: "oklch",
      seeds: { ...DEFAULT_COLOR_CONFIG.seeds },
    },
    tokenOverrides: definition.tokens ?? {},
  });
  if (definition.radiusFactor !== undefined) {
    draft.radiusFactor = definition.radiusFactor;
  }
  return draft;
}

export function resolveThemeDraft(draft: ThemeDraft): ResolvedTheme {
  return resolveTheme(themeDraftToDefinition(draft));
}

export function listEditableTokens(
  draft: ThemeDraft,
  resolved?: ResolvedTheme,
): EditableToken[] {
  const theme = resolved ?? resolveThemeDraft(draft);
  const tokens: EditableToken[] = [];

  for (const layer of TOKEN_LAYER_ORDER) {
    const vocabulary = theme.tokens[layer];
    for (const [name, token] of Object.entries(vocabulary)) {
      const cssValue = resolveTarget(resolveTokenTarget(token.target));
      const overrideValue = getOverrideValue(draft.tokenOverrides, layer, name);
      const item: EditableToken = {
        name,
        layer,
        cssValue,
        category: token.category,
        isOverride: overrideValue !== undefined,
      };
      if (overrideValue !== undefined) {
        item.overrideValue = overrideValue;
      }
      tokens.push(item);
    }
  }

  return tokens;
}

export function listEditableTokensByLayer(
  draft: ThemeDraft,
  resolved?: ResolvedTheme,
): Record<TokenLayerKey, EditableToken[]> {
  const all = listEditableTokens(draft, resolved);
  const grouped = Object.fromEntries(
    TOKEN_LAYER_ORDER.map((layer) => [layer, [] as EditableToken[]]),
  ) as Record<TokenLayerKey, EditableToken[]>;

  for (const token of all) {
    grouped[token.layer].push(token);
  }
  return grouped;
}

export function setTokenOverride(
  draft: ThemeDraft,
  layer: TokenLayerKey,
  name: string,
  value: string | null,
  category?: TokenDefinition["category"],
): ThemeDraft {
  const nextOverrides = deepMergeTokenTree(
    DEFAULT_TOKEN_TREE,
    draft.tokenOverrides,
  );
  const layerOverrides = { ...(draft.tokenOverrides[layer] ?? {}) } as Record<
    string,
    TokenDefinition
  >;

  if (value === null || value.trim() === "") {
    delete layerOverrides[name];
  } else {
    const existing = nextOverrides[layer][name];
    layerOverrides[name] = {
      target: { value: value.trim() },
      category: category ?? existing?.category ?? "foundation",
    };
  }

  const tokenOverrides: DeepPartial<TokenTree> = {
    ...draft.tokenOverrides,
    [layer]: layerOverrides,
  };

  if (Object.keys(layerOverrides).length === 0) {
    delete tokenOverrides[layer];
  }

  return { ...draft, tokenOverrides };
}

export function setColorSeed(
  draft: ThemeDraft,
  seed: keyof NonNullable<ColorConfig["seeds"]>,
  value: string,
): ThemeDraft {
  return {
    ...draft,
    color: {
      ...draft.color,
      seeds: {
        ...draft.color.seeds,
        [seed]: value,
      },
    },
  };
}

export const COLOR_SEED_KEYS = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const satisfies readonly (keyof NonNullable<ColorConfig["seeds"]>)[];

export type ColorSeedKey = (typeof COLOR_SEED_KEYS)[number];
