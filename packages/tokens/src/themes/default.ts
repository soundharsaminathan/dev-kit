import type { ThemeDefinition } from "../types.js";

export const defaultTheme: ThemeDefinition = {
  id: "default",
  label: "Default",
  color: {
    algorithm: "oklch",
    seeds: {
      neutral: "#737373",
      accent: "#3b82f6",
      success: "#22c55e",
      warning: "#eab308",
      danger: "#ef4444",
      info: "#3b82f6",
    },
  },
  radiusFactor: 1,
  fonts: {
    sans: "Inter, ui-sans-serif, system-ui, sans-serif",
    serif: "Source Serif 4, ui-serif, Georgia, serif",
    mono: "JetBrains Mono, ui-monospace, monospace",
  },
};
