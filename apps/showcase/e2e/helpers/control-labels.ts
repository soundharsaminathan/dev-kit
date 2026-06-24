export function formatControlLabel(name: string): string {
  if (name === "children") return "Label";
  if (name === "aria-label") return "Aria label";
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
