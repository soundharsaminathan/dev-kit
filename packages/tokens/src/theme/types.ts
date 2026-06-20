/** A named display mode (`"light"`, `"dark"`, or any custom mode). */
export type ModeName = string;

/** How a semantic token resolves to a CSS value. */
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

export type SemanticCategory = "background" | "foreground" | "border";

export interface SemanticToken {
  target: SemanticTarget | Record<ModeName, SemanticTarget>;
  category: SemanticCategory;
  scales?: readonly string[];
  description?: string;
}

/** Token name without the leading `--` (e.g. `"color-bg"`). */
export type SemanticVocabulary = Record<string, SemanticToken>;
