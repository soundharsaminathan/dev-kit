import type { ThemeDefinition } from "../types.js";

export const materialTheme: ThemeDefinition = {
  id: "material",
  label: "Material",
  extends: "default",
  radiusFactor: 0.75,
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
        target: { ref: "material-elevation-1" },
        category: "effect",
      },
      "shadow-md": {
        target: { ref: "material-elevation-2" },
        category: "effect",
      },
      "shadow-lg": {
        target: { ref: "material-elevation-3" },
        category: "effect",
      },
      "elevation-1": {
        target: { ref: "material-elevation-1" },
        category: "effect",
      },
      "elevation-2": {
        target: { ref: "material-elevation-2" },
        category: "effect",
      },
      "elevation-3": {
        target: { ref: "material-elevation-3" },
        category: "effect",
      },
    },
    interaction: {
      "interaction-press-scale": {
        target: { value: "0.98" },
        category: "interaction",
      },
      "interaction-transition-duration": {
        target: { value: "200ms" },
        category: "interaction",
      },
    },
    components: {
      "btn-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "card-shadow": {
        target: { ref: "elevation-1" },
        category: "component",
      },
      "modal-shadow": {
        target: { ref: "elevation-3" },
        category: "component",
      },
      "scrollbar-size": {
        target: { value: "8px" },
        category: "component",
      },
      "scrollbar-thumb-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "scrollbar-track-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "scrollbar-thumb-background": {
        target: {
          mix: {
            space: "oklch",
            stops: [{ ref: "color-neutral" }, 85, { value: "transparent" }],
          },
        },
        category: "component",
      },
      "scrollbar-thumb-hover-background": {
        target: { ref: "color-neutral-hover" },
        category: "component",
      },
      "scrollbar-thumb-active-background": {
        target: { ref: "color-neutral-active" },
        category: "component",
      },
      "scrollbar-thumb-shadow": {
        target: { ref: "elevation-1" },
        category: "component",
      },
    },
  },
};
