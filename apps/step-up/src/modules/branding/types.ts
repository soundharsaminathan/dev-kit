import type { ThemeDraft, ThemeFonts } from "@dev-ui/tokens";

export type StudioBrandThemePayload = {
  label: string;
  extends: string;
  color: ThemeDraft["color"];
  radiusFactor?: number;
  fonts?: ThemeFonts;
  tokenOverrides: ThemeDraft["tokenOverrides"];
};
