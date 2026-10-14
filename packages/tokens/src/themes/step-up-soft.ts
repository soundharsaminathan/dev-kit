import type { ThemeDefinition } from "../types.js";

export const stepUpSoftTheme: ThemeDefinition = {
  id: "step-up-soft",
  label: "classa Soft",
  extends: "step-up",
  color: {
    algorithm: "oklch",
    seeds: {
      neutral: "#9C9488",
      accent: "#EE8A55",
      success: "#34c759",
      warning: "#ff9f0a",
      danger: "#ff453a",
      info: "#64B5F6",
    },
  },
  radiusFactor: 1.4,
  fonts: {
    sans: '"Plus Jakarta Sans", Inter, ui-sans-serif, system-ui, sans-serif',
    serif: "Source Serif 4, ui-serif, Georgia, serif",
    mono: "JetBrains Mono, ui-monospace, monospace",
  },
  tokens: {
    semantic: {
      "color-primary": {
        target: { ref: "accent-500" },
        category: "background",
      },
      "color-primary-hover": {
        target: { ref: "accent-600" },
        category: "background",
      },
      "color-primary-active": {
        target: { ref: "accent-700" },
        category: "background",
      },
      "color-primary-muted": {
        target: { ref: "accent-100" },
        category: "background",
      },
      "color-fg-on-primary": {
        target: { onOf: "accent-500" },
        category: "foreground",
      },
    },
    components: {
      "surface-background": {
        target: {
          light: { value: "#F8F4EC" },
          dark: { ref: "color-bg" },
        },
        category: "component",
      },
      "color-card": {
        target: {
          light: { value: "#FFFFFF" },
          dark: { ref: "neutral-100" },
        },
        category: "component",
      },
      "card-background": {
        target: {
          light: { value: "#FFFFFF" },
          dark: { ref: "color-card" },
        },
        category: "component",
      },
      "card-radius": {
        target: { ref: "radius-2xl" },
        category: "component",
      },
      "card-shadow": {
        target: { ref: "shadow-sm" },
        category: "component",
      },
      "button-radius": {
        target: { ref: "radius-full" },
        category: "component",
      },
      "input-radius": {
        target: { ref: "radius-xl" },
        category: "component",
      },
    },
  },
};
