export function readCssNumber(element: HTMLElement, name: string) {
  const value = Number.parseFloat(
    getComputedStyle(element).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : undefined;
}
