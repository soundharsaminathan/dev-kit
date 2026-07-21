import type { ThemeDefinition } from "../types.js";

export const stepUpTheme: ThemeDefinition = {
  id: "step-up",
  label: "Step Up",
  color: {
    algorithm: "oklch",
    seeds: {
      neutral: "#8e8e93",
      accent: "#0a84ff",
      success: "#34c759",
      warning: "#ff9f0a",
      danger: "#ff453a",
      info: "#64d2ff",
    },
  },
  radiusFactor: 1.2,
  fonts: {
    sans: '"SF Pro Text", "SF Pro Display", Inter, ui-sans-serif, system-ui, sans-serif',
    serif: "Source Serif 4, ui-serif, Georgia, serif",
    mono: "JetBrains Mono, ui-monospace, monospace",
  },
  tokens: {
    interaction: {
      "interaction-hover-scale": {
        target: { value: "1.01" },
        category: "interaction",
      },
      "interaction-press-scale": {
        target: { value: "0.98" },
        category: "interaction",
      },
      "interaction-transition-duration": {
        target: { value: "220ms" },
        category: "interaction",
      },
      "interaction-transition-curve": {
        target: { value: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
        category: "interaction",
      },
    },
    components: {
      "surface-background": {
        target: {
          light: { ref: "neutral-200" },
          dark: { ref: "color-bg" },
        },
        category: "component",
      },
      "color-card": {
        target: {
          light: { value: "white" },
          dark: { ref: "neutral-100" },
        },
        category: "component",
      },
      "card-background": {
        target: {
          light: { value: "white" },
          dark: { ref: "color-card" },
        },
        category: "component",
      },
      "modal-backdrop-blur": {
        target: { value: "20px" },
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
        target: { ref: "radius-xl" },
        category: "component",
      },
      "input-radius": {
        target: { ref: "radius-xl" },
        category: "component",
      },
    },
  },
};
