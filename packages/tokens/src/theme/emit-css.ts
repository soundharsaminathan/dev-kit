import type {
  ModeName,
  SemanticTarget,
  SemanticToken,
  SemanticVocabulary,
} from "./types.js";

export function resolveTarget(target: SemanticTarget): string {
  if ("ref" in target) return `var(--${target.ref})`;
  if ("onOf" in target) return `var(--on-${target.onOf})`;
  if ("value" in target) return target.value;
  const { space, stops } = target.mix;
  const [a, weight, b] = stops;
  return `color-mix(in ${space}, ${resolveTarget(a)} ${weight}%, ${resolveTarget(b)})`;
}

function isPerMode(
  target: SemanticToken["target"],
): target is Record<ModeName, SemanticTarget> {
  return !(
    "ref" in target ||
    "onOf" in target ||
    "value" in target ||
    "mix" in target
  );
}

function baseTarget(target: SemanticToken["target"]): SemanticTarget {
  if (!isPerMode(target)) return target;
  return target.light ?? (Object.values(target)[0] as SemanticTarget);
}

export interface EmitCssOptions {
  indent?: string;
  selector?: string;
}

export function emitCss(
  vocab: SemanticVocabulary,
  options: EmitCssOptions = {},
): string {
  const indent = options.indent ?? "  ";
  const selector = options.selector ?? ":root";
  const lines: string[] = [`${selector} {`];
  for (const [name, token] of Object.entries(vocab)) {
    lines.push(
      `${indent}--${name}: ${resolveTarget(baseTarget(token.target))};`,
    );
  }
  lines.push("}");
  return `${lines.join("\n")}\n`;
}
