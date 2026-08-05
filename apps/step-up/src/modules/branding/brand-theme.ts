import {
  createThemeDraft,
  definitionToThemeDraft,
  getBuiltInTheme,
  type ThemeDefinition,
  type ThemeDraft,
  themeDraftToDefinition,
} from "@dev-ui/tokens";
import type { StudioBrandThemePayload } from "./types";

/** App surfaces (`/app`, `/me`) use soft; brand themes must inherit its primary→accent wiring. */
export const STUDIO_BRAND_THEME_BASE = "step-up-soft";

/**
 * Older payloads extended `step-up`, where `--color-primary` stays near-black.
 * Map those onto soft so Brand color changes actually recolor buttons/chrome.
 */
export function normalizeBrandThemeBase(extendsId: string): string {
  return extendsId === "step-up" ? STUDIO_BRAND_THEME_BASE : extendsId;
}

export function defaultStudioBrandDraft(label = "Studio brand"): ThemeDraft {
  const base = getBuiltInTheme(STUDIO_BRAND_THEME_BASE);
  if (!base) {
    return createThemeDraft({ label, extends: STUDIO_BRAND_THEME_BASE });
  }
  return {
    ...definitionToThemeDraft(base),
    label,
    extends: STUDIO_BRAND_THEME_BASE,
  };
}

export function brandThemeToDraft(
  brandTheme: StudioBrandThemePayload | null | undefined,
  fallbackLabel = "Studio brand",
): ThemeDraft {
  if (!brandTheme) {
    return defaultStudioBrandDraft(fallbackLabel);
  }

  const options: Partial<ThemeDraft> & { extends?: string } = {
    label: brandTheme.label,
    extends: normalizeBrandThemeBase(brandTheme.extends),
    color: brandTheme.color,
    tokenOverrides: brandTheme.tokenOverrides ?? {},
  };
  if (brandTheme.radiusFactor !== undefined) {
    options.radiusFactor = brandTheme.radiusFactor;
  }
  if (brandTheme.fonts !== undefined) {
    options.fonts = brandTheme.fonts;
  }
  return createThemeDraft(options);
}

export function draftToBrandTheme(draft: ThemeDraft): StudioBrandThemePayload {
  const payload: StudioBrandThemePayload = {
    label: draft.label.trim() || "Studio brand",
    extends: normalizeBrandThemeBase(draft.extends),
    color: draft.color,
    tokenOverrides: draft.tokenOverrides ?? {},
  };
  if (draft.radiusFactor !== undefined) {
    payload.radiusFactor = draft.radiusFactor;
  }
  if (draft.fonts !== undefined) {
    payload.fonts = draft.fonts;
  }
  return payload;
}

export function brandThemeToDefinition(
  brandTheme: StudioBrandThemePayload,
  studioId: string,
): ThemeDefinition {
  return themeDraftToDefinition(
    brandThemeToDraft(brandTheme),
    `studio-${studioId}`,
  );
}
