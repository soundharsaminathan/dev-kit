import type { TokenCategory, TokenDefinition } from "../theme/types.js";

export const val = (
  value: string,
  category: TokenCategory = "foundation",
): TokenDefinition => ({
  target: { value },
  category,
});

export const ref = (
  reference: string,
  category: TokenCategory = "component",
): TokenDefinition => ({
  target: { ref: reference },
  category,
});

export const on = (onOf: string): TokenDefinition => ({
  target: { onOf },
  category: "foreground",
});
