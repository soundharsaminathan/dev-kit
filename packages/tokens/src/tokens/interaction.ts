import type { TokenVocabulary } from "../theme/types.js";
import { ref, val } from "./helpers.js";

export const DEFAULT_INTERACTION = {
  "interaction-focus-ring-width": val("2px", "interaction"),
  "interaction-focus-ring-offset": val("2px", "interaction"),
  "interaction-focus-ring-color": ref("color-border-focus", "interaction"),
  "interaction-transition-duration": val("150ms", "interaction"),
  "interaction-transition-curve": val("ease", "interaction"),
  "interaction-hover-scale": val("1", "interaction"),
  "interaction-press-scale": val("1", "interaction"),
} satisfies TokenVocabulary;
