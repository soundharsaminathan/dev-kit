import {
  createThemeDraft,
  definitionToThemeDraft,
  getBuiltInTheme,
  type ThemeDefinition,
  type ThemeDraft,
  themeDraftToDefinition,
} from "@dev-ui/tokens";
import type { StudioBrandThemePayload } from "./types";

export function defaultStudioBrandDraft(label = "Studio brand"): ThemeDraft {
  const base = getBuiltInTheme("step-up");
  if (!base) {
    return createThemeDraft({ label, extends: "step-up" });
  }
  return {
    ...definitionToThemeDraft(base),
    label,
    extends: "step-up",
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
    extends: brandTheme.extends,
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
    extends: draft.extends,
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
