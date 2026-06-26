import type { TokenVocabulary } from "../theme/types.js";
import { DEFAULT_COMPONENTS } from "./components.js";
import { DEFAULT_EFFECTS } from "./effects.js";
import { DEFAULT_FOUNDATION } from "./foundation.js";
import { DEFAULT_INTERACTION } from "./interaction.js";
import { DEFAULT_EXTENDED_SEMANTICS } from "./semantic.js";

export { DEFAULT_COMPONENTS } from "./components.js";
export { DEFAULT_EFFECTS } from "./effects.js";
export { DEFAULT_FOUNDATION } from "./foundation.js";
export { on, ref, val } from "./helpers.js";
export { DEFAULT_INTERACTION } from "./interaction.js";
export { DEFAULT_EXTENDED_SEMANTICS } from "./semantic.js";

export interface TokenTree {
  foundation: TokenVocabulary;
  semantic: TokenVocabulary;
  effects: TokenVocabulary;
  interaction: TokenVocabulary;
  components: TokenVocabulary;
}

export const DEFAULT_TOKEN_TREE: TokenTree = {
  foundation: DEFAULT_FOUNDATION,
  semantic: DEFAULT_EXTENDED_SEMANTICS,
  effects: DEFAULT_EFFECTS,
  interaction: DEFAULT_INTERACTION,
  components: DEFAULT_COMPONENTS,
};

export function mergeVocabularies(
  ...vocabs: (TokenVocabulary | undefined)[]
): TokenVocabulary {
  return Object.assign({}, ...vocabs.filter(Boolean));
}

export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

export function deepMergeTokenTree(
  base: TokenTree,
  override?: DeepPartial<TokenTree>,
): TokenTree {
  if (!override) return base;
  return {
    foundation: mergeVocabularies(
      base.foundation,
      override.foundation as TokenVocabulary | undefined,
    ),
    semantic: mergeVocabularies(
      base.semantic,
      override.semantic as TokenVocabulary | undefined,
    ),
    effects: mergeVocabularies(
      base.effects,
      override.effects as TokenVocabulary | undefined,
    ),
    interaction: mergeVocabularies(
      base.interaction,
      override.interaction as TokenVocabulary | undefined,
    ),
    components: mergeVocabularies(
      base.components,
      override.components as TokenVocabulary | undefined,
    ),
  };
}
