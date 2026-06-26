import type { TokenVocabulary } from "../theme/types.js";
import { ref } from "./helpers.js";

export const DEFAULT_EXTENDED_SEMANTICS = {
  "surface-primary": ref("color-bg", "background"),
  "surface-secondary": ref("color-muted", "background"),
  "surface-tertiary": ref("color-field", "background"),
  "surface-elevated": ref("color-card", "background"),
  "surface-overlay": ref("color-popover", "background"),

  "text-primary": ref("color-fg", "foreground"),
  "text-secondary": ref("color-fg-muted", "foreground"),
  "text-tertiary": ref("color-fg-disabled", "foreground"),
  "text-inverse": ref("color-fg-inverse", "foreground"),

  "border-default": ref("color-border", "border"),
  "border-subtle": ref("color-border-field", "border"),
  "border-strong": ref("color-border-active", "border"),
  "border-focus": ref("color-border-focus", "border"),
} satisfies TokenVocabulary;
