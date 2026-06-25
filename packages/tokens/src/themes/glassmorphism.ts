import type { ThemeDefinition } from "../types.js";

const glassFill = {
  light: { value: "color-mix(in srgb, white 45%, transparent)" },
  dark: { value: "color-mix(in srgb, white 12%, transparent)" },
} as const;

const glassBorder = {
  light: { value: "rgb(255 255 255 / 0.3)" },
  dark: { value: "rgb(255 255 255 / 0.18)" },
} as const;

const vibrantBackground = {
  light: {
    value:
      "linear-gradient(135deg, #fdf2f8 0%, #e0e7ff 28%, #fef3c7 52%, #d1fae5 76%, #fdf2f8 100%)",
  },
  dark: {
    value:
      "linear-gradient(135deg, oklch(0.28 0.04 350) 0%, oklch(0.26 0.05 270) 28%, oklch(0.27 0.04 85) 52%, oklch(0.26 0.04 165) 76%, oklch(0.28 0.04 300) 100%)",
  },
} as const;

export const glassmorphismTheme: ThemeDefinition = {
  id: "glassmorphism",
  label: "Glassmorphism",
  extends: "default",
  radiusFactor: 1.25,
  color: {
    algorithm: "oklch",
    seeds: {
      neutral: "#2d2d3a",
      accent: "#8b5cf6",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#f472b6",
      info: "#38bdf8",
    },
  },
  tokens: {
    effects: {
      "glass-backdrop-blur": {
        target: { value: "20px" },
        category: "effect",
      },
      "glass-fill": {
        target: glassFill,
        category: "effect",
      },
      "glass-border": {
        target: glassBorder,
        category: "effect",
      },
      "glass-background-opacity": {
        target: { value: "0.45" },
        category: "effect",
      },
      "glass-border-opacity": {
        target: { value: "0.3" },
        category: "effect",
      },
      "glass-vibrant-background": {
        target: vibrantBackground,
        category: "effect",
      },
      "shadow-sm": {
        target: {
          value: "0 10px 40px rgb(0 0 0 / 0.06)",
        },
        category: "effect",
      },
      "shadow-md": {
        target: {
          value: "0 12px 48px rgb(0 0 0 / 0.08)",
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
      "surface-background": {
        target: { ref: "glass-vibrant-background" },
        category: "component",
      },
      "card-radius": {
        target: { ref: "radius-3xl" },
        category: "component",
      },
      "card-background": {
        target: { ref: "glass-fill" },
        category: "component",
      },
      "card-border-color": {
        target: { ref: "glass-border" },
        category: "component",
      },
      "card-backdrop-blur": {
        target: { ref: "glass-backdrop-blur" },
        category: "component",
      },
      "card-shadow": {
        target: { ref: "shadow-sm" },
        category: "component",
      },
      "popover-radius": {
        target: { ref: "radius-2xl" },
        category: "component",
      },
      "popover-background": {
        target: { ref: "glass-fill" },
        category: "component",
      },
      "popover-border-color": {
        target: { ref: "glass-border" },
        category: "component",
      },
      "popover-backdrop-blur": {
        target: { ref: "glass-backdrop-blur" },
        category: "component",
      },
      "popover-shadow": {
        target: { ref: "shadow-md" },
        category: "component",
      },
      "modal-backdrop-blur": {
        target: { ref: "glass-backdrop-blur" },
        category: "component",
      },
      "modal-backdrop-opacity": {
        target: { value: "25%" },
        category: "component",
      },
      "modal-background": {
        target: { ref: "glass-fill" },
        category: "component",
      },
      "modal-border-color": {
        target: { ref: "glass-border" },
        category: "component",
      },
      "modal-panel-backdrop-blur": {
        target: { ref: "glass-backdrop-blur" },
        category: "component",
      },
      "modal-shadow": {
        target: { ref: "shadow-md" },
        category: "component",
      },
      "modal-radius": {
        target: { ref: "radius-3xl" },
        category: "component",
      },
      "dialog-shadow": {
        target: { ref: "shadow-md" },
        category: "component",
      },
      "tooltip-shadow": {
        target: { ref: "shadow-sm" },
        category: "component",
      },
      "input-background": {
        target: {
          light: { value: "rgb(255 255 255 / 0.9)" },
          dark: { value: "rgb(255 255 255 / 0.08)" },
        },
        category: "component",
      },
      "input-backdrop-blur": {
        target: { value: "0px" },
        category: "component",
      },
      "input-border-color": {
        target: {
          light: { value: "rgb(255 255 255 / 0.5)" },
          dark: { ref: "glass-border" },
        },
        category: "component",
      },
      "input-shadow": {
        target: { ref: "shadow-none" },
        category: "component",
      },
      "btn-default-background": {
        target: { ref: "glass-fill" },
        category: "component",
      },
      "btn-primary-background": {
        target: { value: "#7c3aed" },
        category: "component",
      },
      "btn-primary-surface-gradient": {
        target: {
          value: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
        },
        category: "component",
      },
      "btn-hover-shadow": {
        target: {
          value: "0 8px 24px rgb(124 58 237 / 0.35)",
        },
        category: "component",
      },
      "btn-border-color": {
        target: { ref: "glass-border" },
        category: "component",
      },
      "btn-backdrop-blur": {
        target: { ref: "glass-backdrop-blur" },
        category: "component",
      },
      "scrollbar-thumb-background": {
        target: { ref: "glass-fill" },
        category: "component",
      },
      "scrollbar-thumb-hover-background": {
        target: {
          mix: {
            space: "srgb",
            stops: [{ ref: "glass-fill" }, 60, { ref: "color-accent" }],
          },
        },
        category: "component",
      },
      "scrollbar-thumb-active-background": {
        target: {
          mix: {
            space: "srgb",
            stops: [{ ref: "glass-fill" }, 45, { ref: "color-accent" }],
          },
        },
        category: "component",
      },
      "scrollbar-thumb-border-width": {
        target: { value: "1px" },
        category: "component",
      },
      "scrollbar-thumb-border-color": {
        target: { ref: "glass-border" },
        category: "component",
      },
      "scrollbar-thumb-shadow": {
        target: { ref: "shadow-sm" },
        category: "component",
      },
    },
  },
};

/** @deprecated Use glassmorphismTheme */
export const glassTheme = glassmorphismTheme;
