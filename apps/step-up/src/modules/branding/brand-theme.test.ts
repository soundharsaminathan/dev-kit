import { describe, expect, it } from "vitest";
import {
  brandThemeToDefinition,
  brandThemeToDraft,
  defaultStudioBrandDraft,
  draftToBrandTheme,
} from "./brand-theme";

describe("brand-theme helpers", () => {
  it("creates a step-up based default draft", () => {
    const draft = defaultStudioBrandDraft("Acme");
    expect(draft.label).toBe("Acme");
    expect(draft.extends).toBe("step-up");
    expect(draft.color.seeds.accent).toBeTruthy();
  });

  it("round-trips draft payloads", () => {
    const draft = defaultStudioBrandDraft("Studio");
    draft.radiusFactor = 1.5;
    draft.fonts = { sans: "Inter, sans-serif" };
    const payload = draftToBrandTheme(draft);
    const restored = brandThemeToDraft(payload);

    expect(restored.label).toBe("Studio");
    expect(restored.radiusFactor).toBe(1.5);
    expect(restored.fonts?.sans).toBe("Inter, sans-serif");
    expect(restored.extends).toBe("step-up");
  });

  it("builds a studio-scoped theme definition", () => {
    const definition = brandThemeToDefinition(
      draftToBrandTheme(defaultStudioBrandDraft("Brand")),
      "studio-1",
    );
    expect(definition.id).toBe("studio-studio-1");
    expect(definition.extends).toBe("step-up");
  });
});
