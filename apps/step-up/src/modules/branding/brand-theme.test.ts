import { resolveTheme, themeToCss } from "@dev-ui/tokens";
import { describe, expect, it } from "vitest";
import {
  brandThemeToDefinition,
  brandThemeToDraft,
  defaultStudioBrandDraft,
  draftToBrandTheme,
  normalizeBrandThemeBase,
  STUDIO_BRAND_THEME_BASE,
} from "./brand-theme";

describe("brand-theme helpers", () => {
  it("creates a step-up-soft based default draft", () => {
    const draft = defaultStudioBrandDraft("Acme");
    expect(draft.label).toBe("Acme");
    expect(draft.extends).toBe(STUDIO_BRAND_THEME_BASE);
    expect(draft.color.seeds.accent).toBeTruthy();
  });

  it("round-trips draft payloads on the soft base", () => {
    const draft = defaultStudioBrandDraft("Studio");
    draft.radiusFactor = 1.5;
    draft.fonts = { sans: "Inter, sans-serif" };
    const payload = draftToBrandTheme(draft);
    const restored = brandThemeToDraft(payload);

    expect(restored.label).toBe("Studio");
    expect(restored.radiusFactor).toBe(1.5);
    expect(restored.fonts?.sans).toBe("Inter, sans-serif");
    expect(restored.extends).toBe(STUDIO_BRAND_THEME_BASE);
  });

  it("builds a studio-scoped theme definition from soft", () => {
    const definition = brandThemeToDefinition(
      draftToBrandTheme(defaultStudioBrandDraft("Brand")),
      "studio-1",
    );
    expect(definition.id).toBe("studio-studio-1");
    expect(definition.extends).toBe(STUDIO_BRAND_THEME_BASE);
  });

  it("normalizes legacy step-up brand themes onto soft", () => {
    expect(normalizeBrandThemeBase("step-up")).toBe(STUDIO_BRAND_THEME_BASE);
    expect(normalizeBrandThemeBase("step-up-soft")).toBe(
      STUDIO_BRAND_THEME_BASE,
    );

    const draft = brandThemeToDraft({
      label: "Legacy",
      extends: "step-up",
      color: {
        algorithm: "oklch",
        seeds: { neutral: "#8e8e93", accent: "#ef4444" },
      },
      tokenOverrides: {},
    });
    expect(draft.extends).toBe(STUDIO_BRAND_THEME_BASE);

    const definition = brandThemeToDefinition(
      {
        label: "Legacy",
        extends: "step-up",
        color: {
          algorithm: "oklch",
          seeds: { neutral: "#8e8e93", accent: "#ef4444" },
        },
        tokenOverrides: {},
      },
      "legacy-1",
    );
    expect(definition.extends).toBe(STUDIO_BRAND_THEME_BASE);

    const css = themeToCss(resolveTheme(definition), definition.id);
    expect(css).toMatch(/--color-primary:\s*var\(--accent-500\)/);
  });

  it("wires brand accent into primary so UI chrome follows Brand", () => {
    const draft = defaultStudioBrandDraft("Accented");
    draft.color.seeds.accent = "#0ea5e9";
    const definition = brandThemeToDefinition(
      draftToBrandTheme(draft),
      "accent-1",
    );
    const css = themeToCss(resolveTheme(definition), definition.id);

    expect(css).toMatch(/--color-primary:\s*var\(--accent-500\)/);
    expect(css).toContain("--color-accent");
    expect(css).toContain("--accent-500");
  });
});
