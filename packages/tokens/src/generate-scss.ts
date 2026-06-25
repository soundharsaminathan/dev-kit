import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emitCss } from "./theme/emit-css.js";
import { emitPrimitivesBlock, resolveColorConfig } from "./theme/primitives.js";
import { resolveTheme } from "./theme/resolve-theme.js";
import {
  emitThemeBlock,
  getAllSemanticVocabulary,
  THEME_SCOPE_SELECTOR,
} from "./theme/theme-to-css.js";
import {
  type BuiltInThemeId,
  builtInThemes,
  getBuiltInThemeIds,
} from "./themes/index.js";
import {
  DEFAULT_COMPONENTS,
  DEFAULT_EFFECTS,
  DEFAULT_FOUNDATION,
  DEFAULT_INTERACTION,
} from "./tokens/index.js";
import type { ResolvedTheme } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateFoundationSCSS(): string {
  return emitCss(DEFAULT_FOUNDATION);
}

function generateEffectsSCSS(): string {
  return emitCss(DEFAULT_EFFECTS);
}

function generateInteractionSCSS(): string {
  return emitCss(DEFAULT_INTERACTION);
}

function generateComponentsSCSS(): string {
  return emitCss(DEFAULT_COMPONENTS);
}

function generateSemanticsSCSS(): string {
  return emitCss(getAllSemanticVocabulary(), {
    selector: THEME_SCOPE_SELECTOR,
  });
}

function generateThemeFile(themeId: BuiltInThemeId): string {
  const theme = resolveTheme(builtInThemes[themeId]);
  const light = emitThemeBlock(theme, themeId, "light");
  const dark = emitThemeBlock(theme, themeId, "dark");
  return `${light}\n\n${dark}\n`;
}

function generateDefaultThemeSCSS(theme: ResolvedTheme): string {
  const resolved = resolveColorConfig(theme.color);
  const extraVars: Record<string, string> = {};
  if (theme.radiusFactor !== undefined) {
    extraVars["radius-factor"] = String(theme.radiusFactor);
  }
  if (theme.fonts?.sans) extraVars["font-sans"] = theme.fonts.sans;
  if (theme.fonts?.serif) extraVars["font-serif"] = theme.fonts.serif;
  if (theme.fonts?.mono) extraVars["font-mono"] = theme.fonts.mono;

  return emitPrimitivesBlock({
    selector: ":root",
    resolved,
    mode: "light",
    extraVars,
    includeRadiusFactor: true,
  });
}

function generateThemesIndex(themeIds: BuiltInThemeId[]): string {
  return themeIds.map((name) => `@forward "${name}";`).join("\n");
}

function generateSCSS(): void {
  const scssDir = join(__dirname, "..", "scss");
  const themesDir = join(scssDir, "themes");

  mkdirSync(themesDir, { recursive: true });

  const themeIds = getBuiltInThemeIds();
  const defaultTheme = resolveTheme(builtInThemes.default);

  const layers: Array<[string, string]> = [
    ["_foundation.scss", generateFoundationSCSS()],
    ["_default-theme.scss", generateDefaultThemeSCSS(defaultTheme)],
    ["_semantic.scss", generateSemanticsSCSS()],
    ["_effects.scss", generateEffectsSCSS()],
    ["_interaction.scss", generateInteractionSCSS()],
    ["_components.scss", generateComponentsSCSS()],
  ];

  for (const [fileName, content] of layers) {
    const filePath = join(scssDir, fileName);
    writeFileSync(filePath, content, "utf-8");
    console.log(`✓ Generated ${filePath}`);
  }

  for (const themeId of themeIds) {
    const filePath = join(themesDir, `_${themeId}.scss`);
    writeFileSync(filePath, generateThemeFile(themeId), "utf-8");
    console.log(`✓ Generated ${filePath}`);
  }

  const indexPath = join(themesDir, "_index.scss");
  writeFileSync(indexPath, generateThemesIndex(themeIds), "utf-8");
  console.log(`✓ Generated ${indexPath}`);

  console.log(`\n✓ Successfully generated ${themeIds.length} theme files`);
}

try {
  generateSCSS();
} catch (error) {
  console.error("Error generating SCSS files:", error);
  process.exit(1);
}
