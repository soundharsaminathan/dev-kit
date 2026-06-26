import { describe, expect, it } from "vitest";
import {
  createThemeDraft,
  listEditableTokens,
  listEditableTokensByLayer,
  setColorSeed,
  setTokenOverride,
} from "../theme/theme-draft.js";

describe("theme-draft branches", () => {
  it("clears whitespace-only overrides", () => {
    const draft = setTokenOverride(
      createThemeDraft(),
      "foundation",
      "radius-sm",
      "  ",
    );

    expect(draft.tokenOverrides.foundation?.["radius-sm"]).toBeUndefined();
  });

  it("preserves category when overriding an existing token", () => {
    const draft = setTokenOverride(
      createThemeDraft(),
      "interaction",
      "interaction-hover-scale",
      "1.05",
    );

    expect(
      draft.tokenOverrides.interaction?.["interaction-hover-scale"]?.category,
    ).toBeDefined();
  });

  it("stores radiusFactor when provided at creation", () => {
    const draft = createThemeDraft({ radiusFactor: 1.25 });
    expect(draft.radiusFactor).toBe(1.25);
  });

  it("lists editable tokens across layers", () => {
    const draft = createThemeDraft({ label: "Acme" });
    const tokens = listEditableTokens(draft);
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.some((token) => token.layer === "foundation")).toBe(true);
  });

  it("groups editable tokens by layer and updates color seeds", () => {
    const draft = setColorSeed(createThemeDraft(), "accent", "#123456");
    const grouped = listEditableTokensByLayer(draft);

    expect(grouped.foundation.length).toBeGreaterThan(0);
    expect(draft.color.seeds.accent).toBe("#123456");
  });
});
