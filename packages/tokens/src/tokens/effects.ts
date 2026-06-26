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

  "glass-backdrop-blur": val("20px", "effect"),
  "glass-fill": val("color-mix(in srgb, white 22%, transparent)", "effect"),
  "glass-border": val("rgb(255 255 255 / 0.5)", "effect"),
  "glass-background-opacity": val("0.22", "effect"),
  "glass-border-opacity": val("0.5", "effect"),
  "glass-glow-strength": val("0.15", "effect"),
  "glass-vibrant-background": val(
    "linear-gradient(135deg, oklch(0.72 0.2 280) 0%, oklch(0.68 0.18 220) 30%, oklch(0.7 0.19 330) 55%, oklch(0.66 0.16 185) 80%, oklch(0.71 0.18 260) 100%)",
    "effect",
  ),

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

  "neumo-light-shadow": val("-5px -5px 10px rgb(255 255 255 / 0.75)", "effect"),
  "neumo-dark-shadow": val("5px 5px 10px rgb(0 0 0 / 0.12)", "effect"),
  "neumo-surface": val("var(--color-bg)", "effect"),
  "neumo-depth": val("8px", "effect"),
  "neumo-blur": val("12px", "effect"),
  "neumo-light": val(
    "color-mix(in oklch, white 58%, var(--neumo-surface))",
    "effect",
  ),
  "neumo-dark": val(
    "color-mix(in oklch, black 30%, var(--neumo-surface))",
    "effect",
  ),
  "neumo-hill": val(
    "var(--neumo-depth) var(--neumo-depth) var(--neumo-blur) 0 var(--neumo-dark), calc(-1 * var(--neumo-depth)) calc(-1 * var(--neumo-depth)) var(--neumo-blur) 0 var(--neumo-light)",
    "effect",
  ),
  "neumo-dent": val(
    "inset var(--neumo-depth) var(--neumo-depth) var(--neumo-blur) 0 var(--neumo-dark), inset calc(-1 * var(--neumo-depth)) calc(-1 * var(--neumo-depth)) var(--neumo-blur) 0 var(--neumo-light)",
    "effect",
  ),
  "neumo-surface-depth": val("var(--neumo-hill)", "effect"),
  "neumo-pressed-depth": val("var(--neumo-dent)", "effect"),
  "neumo-raised-surface": val("var(--color-bg)", "effect"),
  "neumo-recessed-surface": val("var(--color-bg)", "effect"),
  "neumo-raised-gradient": val("none", "effect"),
  "neumo-recessed-gradient": val("none", "effect"),
  "neumo-button-surface": val("var(--neumo-raised-surface)", "effect"),
  "neumo-button-gradient": val("var(--neumo-raised-gradient)", "effect"),
  "neumo-switch-track-surface": val("var(--neumo-recessed-surface)", "effect"),
  "neumo-switch-track-gradient": val(
    "var(--neumo-recessed-gradient)",
    "effect",
  ),

  "neumo-skailer-raised": val(
    "-7px -7px 1px rgb(255 255 255 / 0.2), -13px -7px 4px rgb(246 251 255 / 0.7), -8px 5px 10px rgb(244 248 251 / 0.3), 10px 9px 10px rgb(170 187 204 / 0.8)",
    "effect",
  ),
  "neumo-skailer-pressed": val(
    "inset -7px -7px 1px rgb(255 255 255 / 0.2), inset -13px -7px 4px rgb(246 251 255 / 0.7), inset -8px 5px 10px rgb(244 248 251 / 0.3), inset 10px 9px 10px rgb(170 187 204 / 0.8)",
    "effect",
  ),

  "brutal-border-width": val("3px", "effect"),
  "brutal-shadow-offset": val("4px", "effect"),
  "brutal-radius": val("0px", "effect"),
  "brutal-outline-width": val("2px", "effect"),
  "brutal-shadow": val("4px 4px 0 0 rgb(0 0 0)", "effect"),

  "aurora-glow-radius": val("48px", "effect"),
  "aurora-gradient-intensity": val("0.6", "effect"),
  "aurora-blur-amount": val("24px", "effect"),
  "aurora-color-spread": val("120deg", "effect"),
  "aurora-glow": val("0 0 48px oklch(0.7 0.2 280 / 0.35)", "effect"),

  "terminal-cursor-blink-rate": val("1s", "effect"),
  "terminal-scanline-opacity": val("0.05", "effect"),
  "terminal-glow-intensity": val("0.4", "effect"),
  "terminal-character-spacing": val("0.05em", "effect"),
  "terminal-glow": val("0 0 8px rgb(0 255 128 / 0.4)", "effect"),
} satisfies TokenVocabulary;
