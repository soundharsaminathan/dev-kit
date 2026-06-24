import type { ThemeDefinition } from "../types.js";

export const glassTheme: ThemeDefinition = {
  id: "glass",
  label: "Glass",
  extends: "default",
  tokens: {
    effects: {
      "shadow-sm": {
        target: {
          value:
            "0 4px 16px rgb(0 0 0 / 0.08), inset 0 1px 0 rgb(255 255 255 / 0.1)",
        },
        category: "effect",
      },
      "shadow-md": {
        target: {
          value:
            "0 8px 32px rgb(0 0 0 / 0.12), inset 0 1px 0 rgb(255 255 255 / 0.15)",
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
        target: { value: "250ms" },
        category: "interaction",
      },
    },
    components: {
      "card-background": {
        target: {
          mix: {
            space: "oklch",
            stops: [{ ref: "color-card" }, 40, { value: "transparent" }],
          },
        },
        category: "component",
      },
      "card-shadow": {
        target: { ref: "shadow-sm" },
        category: "component",
      },
      "modal-backdrop-blur": {
        target: { ref: "glass-backdrop-blur" },
        category: "component",
      },
      "modal-background": {
        target: {
          mix: {
            space: "oklch",
            stops: [{ ref: "color-bg" }, 60, { value: "transparent" }],
          },
        },
        category: "component",
      },
      "popover-radius": {
        target: { ref: "radius-lg" },
        category: "component",
      },
    },
  },
};
