import type { TokenVocabulary } from "../theme/types.js";
import { val } from "./helpers.js";

export const DEFAULT_EFFECTS = {
  "shadow-none": val("none", "effect"),
  "shadow-sm": val("0 1px 2px 0 rgb(0 0 0 / 0.05)", "effect"),
  "shadow-md": val(
    "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    "effect",
  ),
  "shadow-lg": val(
    "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    "effect",
  ),
  "shadow-xl": val(
    "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "effect",
  ),

  "elevation-1": val("var(--shadow-sm)", "effect"),
  "elevation-2": val("var(--shadow-md)", "effect"),
  "elevation-3": val("var(--shadow-lg)", "effect"),
  "elevation-4": val("var(--shadow-xl)", "effect"),
  "elevation-5": val("0 25px 50px -12px rgb(0 0 0 / 0.25)", "effect"),

  "blur-none": val("0px", "effect"),
  "blur-sm": val("4px", "effect"),
  "blur-md": val("8px", "effect"),
  "blur-lg": val("16px", "effect"),
  "blur-xl": val("24px", "effect"),

  "glass-backdrop-blur": val("12px", "effect"),
  "glass-background-opacity": val("0.6", "effect"),
  "glass-border-opacity": val("0.2", "effect"),
  "glass-glow-strength": val("0.15", "effect"),

  "material-state-layer-opacity": val("0.08", "effect"),
  "material-elevation-1": val(
    "0 1px 2px rgb(0 0 0 / 0.3), 0 1px 3px 1px rgb(0 0 0 / 0.15)",
    "effect",
  ),
  "material-elevation-2": val(
    "0 1px 2px rgb(0 0 0 / 0.3), 0 2px 6px 2px rgb(0 0 0 / 0.15)",
    "effect",
  ),
  "material-elevation-3": val(
    "0 4px 8px 3px rgb(0 0 0 / 0.15), 0 1px 3px rgb(0 0 0 / 0.3)",
    "effect",
  ),
} satisfies TokenVocabulary;
