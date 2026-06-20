import {
  oklchCss,
  onBlackWhite,
  type Ramp,
  type ResolvedPalettes,
  resolvePaletteSeeds,
  toOklch,
} from "../vendor/color-kernel.js";
import type { ColorConfig } from "./color-config.js";
import { GENERATIVE_ALGORITHMS } from "./color-config.js";
import { PALETTE_ORDER } from "./palettes.js";

export type { Ramp, ResolvedPalettes };

export function resolveColorConfig(config: ColorConfig): ResolvedPalettes {
  if (
    !(GENERATIVE_ALGORITHMS as readonly string[]).includes(config.algorithm)
  ) {
    throw new Error(
      `resolveColorConfig: "${config.algorithm}" is not a seed-generative algorithm.`,
    );
  }
  return resolvePaletteSeeds(config.seeds);
}

function orderedNames(palettes: Record<string, Ramp>): string[] {
  const ordered = PALETTE_ORDER.filter((name) => name in palettes);
  const extra = Object.keys(palettes)
    .filter((name) => !(PALETTE_ORDER as readonly string[]).includes(name))
    .sort();
  return [...ordered, ...extra];
}

function emitBlock(
  out: string[],
  palettes: Record<string, Ramp>,
  names: string[],
  indent: string,
): void {
  names.forEach((name, index) => {
    const ramp = palettes[name];
    if (!ramp) return;
    for (const [step, value] of Object.entries(ramp)) {
      out.push(`${indent}--${name}-${step}: ${value};`);
    }
    if (index < names.length - 1) out.push("");
  });
}

function emitOnBlock(
  out: string[],
  palettes: Record<string, Ramp>,
  names: string[],
  indent: string,
): void {
  for (const name of names) {
    const ramp = palettes[name];
    if (!ramp) continue;
    for (const [step, value] of Object.entries(ramp)) {
      out.push(`${indent}--on-${name}-${step}: ${onBlackWhite(value)};`);
    }
  }
}

export interface EmitPrimitivesBlockOptions {
  selector: string;
  resolved: ResolvedPalettes;
  mode: "light" | "dark";
  onColors?: boolean;
  extraVars?: Record<string, string>;
  includeRadiusFactor?: boolean;
  indent?: string;
}

export function emitPrimitivesBlock(
  options: EmitPrimitivesBlockOptions,
): string {
  const {
    selector,
    resolved,
    mode,
    onColors = true,
    extraVars = {},
    includeRadiusFactor = false,
    indent = "  ",
  } = options;

  const palettes = mode === "light" ? resolved.light : resolved.dark;
  const names = orderedNames(resolved.light);
  const lines: string[] = [`${selector} {`];

  if (includeRadiusFactor) {
    lines.push(`${indent}--radius-factor: 1;`, "");
  }

  for (const [key, value] of Object.entries(extraVars)) {
    lines.push(`${indent}--${key}: ${value};`);
  }
  if (Object.keys(extraVars).length > 0) lines.push("");

  emitBlock(lines, palettes, names, indent);

  if (onColors) {
    lines.push("");
    emitOnBlock(lines, palettes, names, indent);
  }

  lines.push("}");
  return lines.join("\n");
}

// Re-export for consumers that need stretch utilities
export { oklchCss, toOklch };
