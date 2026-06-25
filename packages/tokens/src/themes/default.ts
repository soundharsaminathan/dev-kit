import type { ThemeDefinition } from "../types.js";

export const defaultTheme: ThemeDefinition = {
  id: "default",
  label: "Default",
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
  radiusFactor: 1,
  fonts: {
    sans: "Inter, ui-sans-serif, system-ui, sans-serif",
    serif: "Source Serif 4, ui-serif, Georgia, serif",
    mono: "JetBrains Mono, ui-monospace, monospace",
  },
};
