import type { ThemeDefinition } from "../types.js";

export const terminalTheme: ThemeDefinition = {
  id: "terminal",
  label: "Terminal",
  extends: "default",
  radiusFactor: 0,
  fonts: {
    sans: "JetBrains Mono, ui-monospace, monospace",
    serif: "JetBrains Mono, ui-monospace, monospace",
    mono: "JetBrains Mono, ui-monospace, monospace",
  },
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
        target: { ref: "terminal-glow" },
        category: "effect",
      },
      "terminal-cursor-blink-rate": {
        target: { value: "1s" },
        category: "effect",
      },
      "terminal-scanline-opacity": {
        target: { value: "0.06" },
        category: "effect",
      },
      "terminal-glow-intensity": {
        target: { value: "0.5" },
        category: "effect",
      },
      "terminal-character-spacing": {
        target: { value: "0.05em" },
        category: "effect",
      },
      "terminal-glow": {
        target: {
          value:
            "0 0 8px color-mix(in oklch, var(--color-accent) calc(var(--terminal-glow-intensity) * 100%), transparent), 0 0 16px color-mix(in oklch, var(--color-accent) calc(var(--terminal-glow-intensity) * 50%), transparent)",
        },
        category: "effect",
      },
    },
    interaction: {
      "interaction-transition-duration": {
        target: { value: "80ms" },
        category: "interaction",
      },
      "interaction-transition-curve": {
        target: { value: "linear" },
        category: "interaction",
      },
      "interaction-focus-ring-width": {
        target: { value: "1px" },
        category: "interaction",
      },
    },
    components: {
      "btn-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "btn-shadow": {
        target: { ref: "terminal-glow" },
        category: "component",
      },
      "input-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "input-shadow": {
        target: { ref: "terminal-glow" },
        category: "component",
      },
      "card-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "card-shadow": {
        target: { ref: "terminal-glow" },
        category: "component",
      },
      "dialog-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "dialog-shadow": {
        target: { ref: "terminal-glow" },
        category: "component",
      },
      "modal-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "popover-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "tooltip-radius": {
        target: { ref: "radius-sm" },
        category: "component",
      },
      "tooltip-shadow": {
        target: { ref: "terminal-glow" },
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
      "scrollbar-track-background": {
        target: { ref: "color-bg" },
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
        target: { value: "1px" },
        category: "component",
      },
      "scrollbar-thumb-border-color": {
        target: { ref: "color-accent" },
        category: "component",
      },
      "scrollbar-thumb-shadow": {
        target: { ref: "terminal-glow" },
        category: "component",
      },
      "scrollbar-thumb-hover-shadow": {
        target: { ref: "terminal-glow" },
        category: "component",
      },
    },
  },
};
