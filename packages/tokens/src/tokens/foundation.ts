import type { TokenVocabulary } from "../theme/types.js";
import { val } from "./helpers.js";

export const DEFAULT_FOUNDATION = {
  "radius-factor": val("1"),
  "radius-xs": val("calc(0.125rem * var(--radius-factor))"),
  "radius-sm": val("calc(0.25rem * var(--radius-factor))"),
  "radius-md": val("calc(0.375rem * var(--radius-factor))"),
  "radius-lg": val("calc(0.5rem * var(--radius-factor))"),
  "radius-xl": val("calc(0.75rem * var(--radius-factor))"),
  "radius-2xl": val("calc(1rem * var(--radius-factor))"),
  "radius-3xl": val("calc(1.5rem * var(--radius-factor))"),
  "radius-4xl": val("calc(2rem * var(--radius-factor))"),
  "radius-full": val("9999px"),

  "space-1": val("0.25rem"),
  "space-2": val("0.5rem"),
  "space-3": val("0.75rem"),
  "space-4": val("1rem"),
  "space-5": val("1.25rem"),
  "space-6": val("1.5rem"),
  "space-8": val("2rem"),
  "space-10": val("2.5rem"),
  "space-12": val("3rem"),

  "font-weight-medium": val("500"),
  "font-size-xs": val("0.75rem"),
  "font-size-sm": val("0.875rem"),
  "font-size-md": val("1rem"),
  "font-size-lg": val("1.125rem"),
  "line-height-tight": val("1.25"),
  "line-height-normal": val("1.5"),

  "motion-fast": val("100ms"),
  "motion-normal": val("200ms"),
  "motion-slow": val("300ms"),

  "motion-offset-sm": val("8px"),
  "motion-offset-md": val("10px"),
  "motion-offset-lg": val("20px"),
  "motion-blur-sm": val("3px"),
  "motion-blur-md": val("6px"),
  "motion-scale-enter": val("0.97"),
  "motion-scale-exit": val("0.98"),

  "cursor-interactive": val("pointer"),
  "cursor-disabled": val("not-allowed"),
} satisfies TokenVocabulary;
