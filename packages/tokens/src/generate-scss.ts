/**
 * SCSS generation — layered tokens:
 * primitives (per preset/mode) → semantics → component aliases
 */

/// <reference types="node" />

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type ThemePresetName, themePresets } from "./presets/index.js";
import { emitCss } from "./theme/emit-css.js";
import { emitPrimitivesBlock, resolveColorConfig } from "./theme/primitives.js";
import { DEFAULT_SEMANTICS } from "./theme/semantics.js";
import type { ThemePreset } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function presetSelector(presetName: string, mode: "light" | "dark"): string {
  return `[data-theme-preset="${presetName}"][data-theme-mode="${mode}"]`;
}

function presetExtraVars(preset: ThemePreset): Record<string, string> {
  const vars: Record<string, string> = {};
  if (preset.radiusFactor !== undefined) {
    vars["radius-factor"] = String(preset.radiusFactor);
  }
  if (preset.fonts?.sans) vars["font-sans"] = preset.fonts.sans;
  if (preset.fonts?.serif) vars["font-serif"] = preset.fonts.serif;
  if (preset.fonts?.mono) vars["font-mono"] = preset.fonts.mono;
  return vars;
}

function generatePresetFile(presetName: ThemePresetName): string {
  const preset = themePresets[presetName];
  const resolved = resolveColorConfig(preset.color);
  const extraVars = presetExtraVars(preset);

  const lightBlock = emitPrimitivesBlock({
    selector: presetSelector(presetName, "light"),
    resolved,
    mode: "light",
    extraVars,
  });

  const darkBlock = emitPrimitivesBlock({
    selector: presetSelector(presetName, "dark"),
    resolved,
    mode: "dark",
    extraVars,
  });

  return `// Auto-generated primitive ramps: ${presetName}
// Edit src/presets/${presetName}.ts — do not edit by hand.

${lightBlock}

${darkBlock}
`;
}

function generateDefaultThemeSCSS(firstPresetName: ThemePresetName): string {
  const preset = themePresets[firstPresetName];
  const resolved = resolveColorConfig(preset.color);

  const block = emitPrimitivesBlock({
    selector: ":root",
    resolved,
    mode: "light",
    extraVars: presetExtraVars(preset),
    includeRadiusFactor: true,
  });

  return `// Auto-generated :root primitive fallback (${firstPresetName} light)
// Do not edit by hand.

${block}
`;
}

function generateSemanticsSCSS(): string {
  const body = emitCss(DEFAULT_SEMANTICS, { selector: ":root" });
  return `// Semantic color vocabulary (DEFAULT_SEMANTICS)
// Maps --color-* tokens to primitive ramps. Do not edit by hand.

${body}`;
}

function generateThemesIndex(presetNames: ThemePresetName[]): string {
  const imports = presetNames.map((name) => `@forward "${name}";`).join("\n");
  return `// Auto-generated themes index
// Do not edit by hand.

${imports}
`;
}

function generateSCSS(): void {
  const scssDir = join(__dirname, "..", "scss");
  const themesDir = join(scssDir, "themes");

  mkdirSync(themesDir, { recursive: true });

  const presetNames = Object.keys(themePresets) as ThemePresetName[];
  const firstPreset = presetNames[0];
  if (!firstPreset) {
    throw new Error("No theme presets configured");
  }

  for (const presetName of presetNames) {
    const scssContent = generatePresetFile(presetName);
    const filePath = join(themesDir, `_${presetName}.scss`);
    writeFileSync(filePath, scssContent, "utf-8");
    console.log(`✓ Generated ${filePath}`);
  }

  const indexPath = join(themesDir, "_index.scss");
  writeFileSync(indexPath, generateThemesIndex(presetNames), "utf-8");
  console.log(`✓ Generated ${indexPath}`);

  const defaultThemePath = join(scssDir, "_default-theme.scss");
  writeFileSync(
    defaultThemePath,
    generateDefaultThemeSCSS(firstPreset),
    "utf-8",
  );
  console.log(`✓ Generated ${defaultThemePath}`);

  const semanticPath = join(scssDir, "_semantic.scss");
  writeFileSync(semanticPath, generateSemanticsSCSS(), "utf-8");
  console.log(`✓ Generated ${semanticPath}`);

  console.log(`\n✓ Successfully generated ${presetNames.length} theme files`);
}

try {
  generateSCSS();
} catch (error) {
  console.error("Error generating SCSS files:", error);
  process.exit(1);
}
