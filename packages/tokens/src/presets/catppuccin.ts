import type { ThemePreset } from "../types.js";

export const catppuccin: ThemePreset = {
  label: "Catppuccin",
  createdAt: "2025-04-18",
  color: {
    algorithm: "oklch",
    seeds: {
      neutral: "#6c6f85",
      accent: "#8839ef",
      success: "#40a02b",
      warning: "#fe640b",
      danger: "#d20f39",
      info: "#04a5e5",
    },
  },
  radiusFactor: 0.9,
  fonts: {
    sans: "Montserrat, ui-sans-serif, system-ui, sans-serif",
    serif: "Georgia, ui-serif, serif",
    mono: "Fira Code, ui-monospace, monospace",
  },
};
