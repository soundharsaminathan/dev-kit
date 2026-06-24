export const THEME_FONT_FAMILIES = [
  "Inter",
  "Montserrat",
  "Plus Jakarta Sans",
  "Source Serif 4",
  "JetBrains Mono",
  "Lora",
  "IBM Plex Mono",
  "Fira Code",
] as const;

export type ThemeFontFamily = (typeof THEME_FONT_FAMILIES)[number];
