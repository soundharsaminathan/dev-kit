/**
 * Self-contained OKLCH ramp kernel for primitive color ramp generation.
 */

import Color from "colorjs.io";

export const SEMANTIC_COLORS = {
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#eab308",
  info: "#3b82f6",
} as const;

export const SCALE_STEPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

export type Oklch = { l: number; c: number; h: number };
export type Ramp = Record<string, string>;

const L_ANCHORS = [
  0.9778, 0.9356, 0.8811, 0.8267, 0.7422, 0.6478, 0.5733, 0.4689, 0.3944, 0.32,
  0.2378,
] as const;

function normHue(h: number | null | undefined): number {
  return h == null || Number.isNaN(h) ? 0 : h;
}

function round(x: number, n: number): number {
  const f = 10 ** n;
  return Math.round(x * f) / f;
}

export function toOklch(input: string): Oklch {
  const [l, c, h] = new Color(input).to("oklch").coords;
  return { l: l ?? 0, c: c ?? 0, h: normHue(h) };
}

export function gamutMap(o: Oklch): Oklch {
  const color = new Color("oklch", [o.l, o.c, normHue(o.h)]);
  const [l, c, h] = color
    .toGamut({ space: "srgb", method: "css" })
    .to("oklch").coords;
  return { l: l ?? 0, c: c ?? 0, h: normHue(h) };
}

export function oklchCss(o: Oklch): string {
  const L = round(Math.min(1, Math.max(0, o.l)), 4);
  const C = round(Math.max(0, o.c), 4);
  if (C < 0.0005) return `oklch(${L} 0 0)`;
  const H = round(((normHue(o.h) % 360) + 360) % 360, 2);
  return `oklch(${L} ${C} ${H})`;
}

export function toSrgb(input: string | Oklch): {
  r: number;
  g: number;
  b: number;
} {
  const color =
    typeof input === "string"
      ? new Color(input)
      : new Color("oklch", [input.l, input.c, normHue(input.h)]);
  const [r, g, b] = color.to("srgb").coords;
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
}

export function onBlackWhite(background: string): "black" | "white" {
  const { r, g, b } = toSrgb(background);
  const lin = (channel: number): number => {
    const s = Math.round(channel * 255) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05)
    ? "black"
    : "white";
}

export function resample(anchors: readonly number[], n: number): number[] {
  if (n <= 1) return [anchors[anchors.length - 1]!];
  if (n === anchors.length) return [...anchors];
  const out: number[] = [];
  const last = anchors.length - 1;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * last;
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, last);
    const f = t - lo;
    out.push(anchors[lo]! * (1 - f) + anchors[hi]! * f);
  }
  return out;
}

function chromaEnvelope(i: number, n: number): number {
  if (n <= 1) return 1;
  return 0.45 + 0.55 * Math.sin(Math.PI * (i / (n - 1)));
}

function generateOklchRamp(seed: string, neutral = false): Ramp {
  const parsed = toOklch(seed);
  const steps = [...SCALE_STEPS];
  const lightnesses = resample(L_ANCHORS, steps.length);
  const neutralMaxC = 0.012;
  const minPeakC = 0.11;
  const peakC = neutral
    ? Math.min(parsed.c, neutralMaxC)
    : Math.max(parsed.c, minPeakC);

  const ramp: Ramp = {};
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const c = peakC * chromaEnvelope(i, steps.length);
    ramp[step] = oklchCss(gamutMap({ l: lightnesses[i]!, c, h: parsed.h }));
  }
  return ramp;
}

function reverseRamp(scale: Ramp): Ramp {
  const steps = Object.keys(scale);
  const reversed = Object.values(scale).reverse();
  const out: Ramp = {};
  steps.forEach((step, index) => {
    const value = reversed[index];
    if (value !== undefined) out[step] = value;
  });
  return out;
}

function stretchLightness(scale: Ramp, min: number, max: number): Ramp {
  const lightnesses = Object.values(scale).map((value) => toOklch(value).l);
  const lo = Math.min(...lightnesses);
  const hi = Math.max(...lightnesses);
  const span = hi - lo || 1;
  const out: Ramp = {};
  for (const [step, value] of Object.entries(scale)) {
    const { l, c, h } = toOklch(value);
    const t = (l - lo) / span;
    const eased = t * t * (3 - 2 * t);
    out[step] = oklchCss({ l: min + eased * (max - min), c, h });
  }
  return out;
}

const NEUTRAL_L_MIN = 0.13;
const NEUTRAL_L_MAX = 0.985;

export interface PaletteSeeds {
  neutral: string;
  accent: string;
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
}

export interface ResolvedPalettes {
  steps: string[];
  light: Record<string, Ramp>;
  dark: Record<string, Ramp>;
}

export function resolvePaletteSeeds(seeds: PaletteSeeds): ResolvedPalettes {
  const statusDefaults: Record<string, string> = { ...SEMANTIC_COLORS };
  const light: Record<string, Ramp> = {
    neutral: stretchLightness(
      generateOklchRamp(seeds.neutral, true),
      NEUTRAL_L_MIN,
      NEUTRAL_L_MAX,
    ),
    accent: generateOklchRamp(seeds.accent),
  };

  for (const name of ["success", "warning", "danger", "info"] as const) {
    const seed = seeds[name] ?? statusDefaults[name];
    if (seed) light[name] = generateOklchRamp(seed);
  }

  const dark: Record<string, Ramp> = {};
  for (const [name, scale] of Object.entries(light)) {
    dark[name] = reverseRamp(scale);
  }

  return { steps: [...SCALE_STEPS], light, dark };
}
