import type { ThemeDefinition } from "../types.js";

export const auroraTheme: ThemeDefinition = {
  id: "aurora",
  label: "Aurora",
  extends: "default",
  color: {
    algorithm: "oklch",
    seeds: {
      neutral: "#64748b",
      accent: "#8b5cf6",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#f472b6",
      info: "#38bdf8",
    },
  },
  tokens: {
    effects: {
      "shadow-sm": {
        target: { ref: "aurora-glow" },
        category: "effect",
      },
      "shadow-md": {
        target: {
          value:
            "0 0 32px oklch(0.65 0.22 280 / 0.3), 0 0 64px oklch(0.6 0.18 220 / 0.15)",
        },
        category: "effect",
      },
      "aurora-glow-radius": {
        target: { value: "48px" },
        category: "effect",
      },
      "aurora-gradient-intensity": {
        target: { value: "0.65" },
        category: "effect",
      },
      "aurora-blur-amount": {
        target: { value: "24px" },
        category: "effect",
      },
      "aurora-color-spread": {
        target: { value: "120deg" },
        category: "effect",
      },
      "aurora-glow": {
        target: {
          value:
            "0 0 var(--aurora-glow-radius) oklch(0.7 0.2 280 / 0.35), 0 0 calc(var(--aurora-glow-radius) * 2) oklch(0.6 0.15 220 / 0.2)",
        },
        category: "effect",
      },
    },
    interaction: {
      "interaction-hover-scale": {
        target: { value: "1.02" },
        category: "interaction",
      },
      "interaction-transition-duration": {
        target: { value: "300ms" },
        category: "interaction",
      },
      "interaction-transition-curve": {
        target: { value: "cubic-bezier(0.4, 0, 0.2, 1)" },
        category: "interaction",
      },
    },
    components: {
      "card-shadow": {
        target: { ref: "aurora-glow" },
        category: "component",
      },
      "card-background": {
        target: {
          mix: {
            space: "oklch",
            stops: [{ ref: "color-card" }, 80, { value: "transparent" }],
          },
        },
        category: "component",
      },
      "modal-backdrop-blur": {
        target: { ref: "aurora-blur-amount" },
        category: "component",
      },
      "modal-background": {
        target: {
          mix: {
            space: "oklch",
            stops: [{ ref: "color-bg" }, 70, { value: "transparent" }],
          },
        },
        category: "component",
      },
      "dialog-shadow": {
        target: { ref: "shadow-md" },
        category: "component",
      },
      "popover-radius": {
        target: { ref: "radius-lg" },
        category: "component",
      },
      "tooltip-shadow": {
        target: { ref: "aurora-glow" },
        category: "component",
      },
      "scrollbar-thumb-background": {
        target: { ref: "color-accent" },
        category: "component",
      },
      "scrollbar-thumb-hover-background": {
        target: { ref: "color-accent-hover" },
        category: "component",
      },
      "scrollbar-thumb-active-background": {
        target: { ref: "color-accent-active" },
        category: "component",
      },
      "scrollbar-thumb-shadow": {
        target: { ref: "aurora-glow" },
        category: "component",
      },
      "scrollbar-thumb-hover-shadow": {
        target: { ref: "shadow-md" },
        category: "component",
      },
    },
  },
};
