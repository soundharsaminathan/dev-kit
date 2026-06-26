import type { ThemeDefinition, ThemeMode } from "../types.js";
import { onBlackWhite } from "../vendor/color-kernel.js";
import { resolveColorConfig } from "./primitives.js";
import { DEFAULT_SEMANTICS } from "./semantics.js";
import type { SemanticTarget, TokenVocabulary } from "./types.js";

function isPerMode(
  target: SemanticTarget | Record<string, SemanticTarget>,
): target is Record<string, SemanticTarget> {
  return !(
    "ref" in target ||
    "onOf" in target ||
    "value" in target ||
    "mix" in target
  );
}

function parseRampRef(
  ref: string,
): { palette: string; step: string } | undefined {
  const match = ref.match(/^(.+)-(\d+)$/);
  if (!match?.[1] || !match[2]) return undefined;
  return { palette: match[1], step: match[2] };
}

function resolvePrimitive(
  ref: string,
  ramps: Record<string, Record<string, string>>,
): string | undefined {
  const parsed = parseRampRef(ref);
  if (!parsed) return undefined;
  return ramps[parsed.palette]?.[parsed.step];
}

function resolveOnColor(
  onOf: string,
  ramps: Record<string, Record<string, string>>,
): string | undefined {
  const parsed = parseRampRef(onOf);
  if (!parsed) return undefined;
  const bg = ramps[parsed.palette]?.[parsed.step];
  if (!bg) return undefined;
  return onBlackWhite(bg);
}

function resolveTargetValue(
  target: SemanticTarget,
  ramps: Record<string, Record<string, string>>,
): string | undefined {
  if ("ref" in target) return resolvePrimitive(target.ref, ramps);
  if ("onOf" in target) return resolveOnColor(target.onOf, ramps);
  if ("value" in target) return target.value;
  return undefined;
}

/** Resolve semantic token names to concrete color strings for a preset/mode. */
export function resolveSemanticColors(
  theme: ThemeDefinition,
  mode: ThemeMode,
  semantics: TokenVocabulary = DEFAULT_SEMANTICS,
): Record<string, string> {
  if (!theme.color) {
    throw new Error(`Theme "${theme.id}" has no color configuration`);
  }
  const resolved = resolveColorConfig(theme.color);
  const ramps = mode === "light" ? resolved.light : resolved.dark;

  const out: Record<string, string> = {};
  for (const [name, token] of Object.entries(semantics)) {
    const target = isPerMode(token.target)
      ? (token.target[mode] ?? token.target.light)
      : token.target;
    if (!target) continue;
    const value = resolveTargetValue(target, ramps);
    if (value) out[name] = value;
  }
  return out;
}

export function getSemanticColor(
  theme: ThemeDefinition,
  mode: ThemeMode,
  token: string,
): string | undefined {
  return resolveSemanticColors(theme, mode)[token];
}
