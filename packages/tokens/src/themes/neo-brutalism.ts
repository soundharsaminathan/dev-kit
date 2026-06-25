import type { ThemeDefinition } from "../types.js";

export const neoBrutalismTheme: ThemeDefinition = {
  id: "neo-brutalism",
  label: "Neo Brutalism",
  extends: "default",
  radiusFactor: 0,
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
        target: { ref: "brutal-shadow" },
        category: "effect",
      },
      "shadow-md": {
        target: { value: "6px 6px 0 0 rgb(0 0 0)" },
        category: "effect",
      },
      "shadow-lg": {
        target: { value: "8px 8px 0 0 rgb(0 0 0)" },
        category: "effect",
      },
      "brutal-border-width": {
        target: { value: "3px" },
        category: "effect",
      },
      "brutal-shadow-offset": {
        target: { value: "4px" },
        category: "effect",
      },
      "brutal-radius": {
        target: { value: "0px" },
        category: "effect",
      },
      "brutal-outline-width": {
        target: { value: "2px" },
        category: "effect",
      },
      "brutal-shadow": {
        target: {
          value:
            "var(--brutal-shadow-offset) var(--brutal-shadow-offset) 0 0 var(--color-fg)",
        },
        category: "effect",
      },
    },
    interaction: {
      "interaction-hover-scale": {
        target: { value: "1.05" },
        category: "interaction",
      },
      "interaction-press-scale": {
        target: { value: "1" },
        category: "interaction",
      },
      "interaction-transition-duration": {
        target: { value: "100ms" },
        category: "interaction",
      },
      "interaction-transition-curve": {
        target: { value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
        category: "interaction",
      },
    },
    components: {
      "btn-radius": {
        target: { ref: "brutal-radius" },
        category: "component",
      },
      "btn-shadow": {
        target: { ref: "brutal-shadow" },
        category: "component",
      },
      "card-radius": {
        target: { ref: "brutal-radius" },
        category: "component",
      },
      "card-shadow": {
        target: { ref: "brutal-shadow" },
        category: "component",
      },
      "input-radius": {
        target: { ref: "brutal-radius" },
        category: "component",
      },
      "input-shadow": {
        target: { ref: "brutal-shadow" },
        category: "component",
      },
      "dialog-radius": {
        target: { ref: "brutal-radius" },
        category: "component",
      },
      "dialog-shadow": {
        target: { ref: "shadow-md" },
        category: "component",
      },
      "modal-radius": {
        target: { ref: "brutal-radius" },
        category: "component",
      },
      "modal-shadow": {
        target: { ref: "shadow-md" },
        category: "component",
      },
      "popover-radius": {
        target: { ref: "brutal-radius" },
        category: "component",
      },
      "tooltip-radius": {
        target: { ref: "brutal-radius" },
        category: "component",
      },
      "tooltip-shadow": {
        target: { ref: "brutal-shadow" },
        category: "component",
      },
      "scrollbar-size": {
        target: { value: "12px" },
        category: "component",
      },
      "scrollbar-thumb-radius": {
        target: { ref: "brutal-radius" },
        category: "component",
      },
      "scrollbar-track-radius": {
        target: { ref: "brutal-radius" },
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
      "scrollbar-thumb-border-width": {
        target: { ref: "brutal-border-width" },
        category: "component",
      },
      "scrollbar-thumb-border-color": {
        target: { ref: "color-fg" },
        category: "component",
      },
      "scrollbar-thumb-shadow": {
        target: { ref: "brutal-shadow" },
        category: "component",
      },
      "scrollbar-thumb-hover-shadow": {
        target: { ref: "shadow-md" },
        category: "component",
      },
      "switch-thumb-shadow": {
        target: { ref: "shadow-none" },
        category: "component",
      },
    },
  },
};
