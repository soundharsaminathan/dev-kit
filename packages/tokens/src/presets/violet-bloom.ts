import type { ThemePreset } from "../types.js";

export const violetBloom: ThemePreset = {
  label: "Violet Bloom",
  createdAt: "2025-06-26",
  color: {
    algorithm: "oklch",
    seeds: {
      neutral: "#525252",
      accent: "#7033ff",
      success: "#4ac885",
      warning: "#fd822b",
      danger: "#e54b4f",
      info: "#3276e4",
    },
  },
  radiusFactor: 1.4,
  fonts: {
    sans: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif",
    serif: "Lora, ui-serif, Georgia, serif",
    mono: "IBM Plex Mono, ui-monospace, monospace",
  },
};
