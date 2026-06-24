/** A named display mode (`"light"`, `"dark"`, or any custom mode). */
export type ModeName = string;

/** How a token resolves to a CSS value. */
export type SemanticTarget =
  | { ref: string }
  | { onOf: string }
  | { value: string }
  | {
      mix: {
        space: "oklab" | "oklch" | "srgb";
        stops: [SemanticTarget, number, SemanticTarget];
      };
    };

export type TokenCategory =
  | "background"
  | "foreground"
  | "border"
  | "effect"
  | "interaction"
  | "component"
  | "foundation";

export interface TokenDefinition {
  target: SemanticTarget | Record<ModeName, SemanticTarget>;
  category: TokenCategory;
  scales?: readonly string[];
  description?: string;
}

/** @deprecated Use TokenDefinition */
export type SemanticToken = TokenDefinition;

/** Token name without the leading `--` (e.g. `"color-bg"`). */
export type TokenVocabulary = Record<string, TokenDefinition>;

/** @deprecated Use TokenVocabulary */
export type SemanticVocabulary = TokenVocabulary;

/** @deprecated Use TokenCategory */
export type SemanticCategory = "background" | "foreground" | "border";
