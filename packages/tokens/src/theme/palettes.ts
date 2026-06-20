export const PALETTE_ORDER = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const;

export const STATUS_PALETTES = [
  "success",
  "warning",
  "danger",
  "info",
] as const;

export type PaletteName = (typeof PALETTE_ORDER)[number];

export const ACCENT_KERNEL_NAME = "primary";

export const toKernelPaletteName = (name: string): string =>
  name === "accent" ? ACCENT_KERNEL_NAME : name;

export const fromKernelPaletteName = (name: string): string =>
  name === ACCENT_KERNEL_NAME ? "accent" : name;
