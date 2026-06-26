import { getSemanticColor } from "./theme/resolve-semantic-colors.js";
import { resolveThemeById } from "./theme/resolve-theme.js";
import type { ThemeMode } from "./types.js";

export interface AriaThemeColors {
  background?: string;
  backgroundHover?: string;
  backgroundActive?: string;
  backgroundSelected?: string;
  backgroundDisabled?: string;
  foreground?: string;
  foregroundHover?: string;
  foregroundActive?: string;
  foregroundDisabled?: string;
  border?: string;
  borderHover?: string;
  borderFocus?: string;
  borderDisabled?: string;
  focusRing?: string;
  button?: {
    background?: string;
    backgroundHover?: string;
    backgroundActive?: string;
    backgroundDisabled?: string;
    foreground?: string;
    foregroundDisabled?: string;
    border?: string;
  };
}

export function themeTokensToAriaColors(
  themeId: string,
  mode: ThemeMode,
): AriaThemeColors {
  const theme = resolveThemeById(themeId);
  const c = (token: string) => getSemanticColor(theme, mode, token);

  const background = c("color-bg");
  const backgroundHover = c("color-muted");
  const backgroundActive = c("color-accent-muted");
  const backgroundSelected = c("color-selected");
  const backgroundDisabled = c("color-disabled");
  const foreground = c("color-fg");
  const foregroundHover = c("color-fg-accent");
  const foregroundActive = c("color-fg-accent");
  const foregroundDisabled = c("color-fg-disabled");
  const border = c("color-border");
  const borderHover = c("color-border-hover");
  const borderFocus = c("color-border-focus");
  const borderDisabled = c("color-border-disabled");
  const focusRing = c("color-border-focus");

  const btnBackground = c("color-primary");
  const btnBackgroundHover = c("color-primary-hover");
  const btnBackgroundActive = c("color-primary-active");
  const btnBackgroundDisabled = c("color-disabled");
  const btnForeground = c("color-fg-on-primary");
  const btnForegroundDisabled = c("color-fg-disabled");
  const btnBorder = c("color-border");

  const colors: AriaThemeColors = {};

  if (background !== undefined) colors.background = background;
  if (backgroundHover !== undefined) colors.backgroundHover = backgroundHover;
  if (backgroundActive !== undefined)
    colors.backgroundActive = backgroundActive;
  if (backgroundSelected !== undefined) {
    colors.backgroundSelected = backgroundSelected;
  }
  if (backgroundDisabled !== undefined) {
    colors.backgroundDisabled = backgroundDisabled;
  }
  if (foreground !== undefined) colors.foreground = foreground;
  if (foregroundHover !== undefined) colors.foregroundHover = foregroundHover;
  if (foregroundActive !== undefined)
    colors.foregroundActive = foregroundActive;
  if (foregroundDisabled !== undefined) {
    colors.foregroundDisabled = foregroundDisabled;
  }
  if (border !== undefined) colors.border = border;
  if (borderHover !== undefined) colors.borderHover = borderHover;
  if (borderFocus !== undefined) colors.borderFocus = borderFocus;
  if (borderDisabled !== undefined) colors.borderDisabled = borderDisabled;
  if (focusRing !== undefined) colors.focusRing = focusRing;

  const button: NonNullable<AriaThemeColors["button"]> = {};
  if (btnBackground !== undefined) button.background = btnBackground;
  if (btnBackgroundHover !== undefined) {
    button.backgroundHover = btnBackgroundHover;
  }
  if (btnBackgroundActive !== undefined) {
    button.backgroundActive = btnBackgroundActive;
  }
  if (btnBackgroundDisabled !== undefined) {
    button.backgroundDisabled = btnBackgroundDisabled;
  }
  if (btnForeground !== undefined) button.foreground = btnForeground;
  if (btnForegroundDisabled !== undefined) {
    button.foregroundDisabled = btnForegroundDisabled;
  }
  if (btnBorder !== undefined) button.border = btnBorder;
  if (Object.keys(button).length > 0) colors.button = button;

  return colors;
}

export function getAriaColorScheme(mode: ThemeMode): "light" | "dark" {
  return mode;
}

export function getAriaThemeConfig(
  themeId: string,
  mode: ThemeMode,
): {
  colorScheme: "light" | "dark";
  theme: AriaThemeColors;
} {
  return {
    colorScheme: getAriaColorScheme(mode),
    theme: themeTokensToAriaColors(themeId, mode),
  };
}
