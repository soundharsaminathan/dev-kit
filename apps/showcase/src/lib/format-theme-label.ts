export function formatThemeLabel(themeId: string, label?: string): string {
  if (label) return label;
  return themeId
    .replace(/^custom-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
