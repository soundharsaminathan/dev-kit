import { describe, expect, it } from "vitest";
import {
  COLOR_SEED_KEYS,
  createThemeDraft,
  definitionToThemeDraft,
  listEditableTokens,
  listEditableTokensByLayer,
  resolveThemeDraft,
  setColorSeed,
  setTokenOverride,
  TOKEN_LAYER_ORDER,
  themeDraftToDefinition,
} from "../theme/theme-draft.js";
import { builtInThemes } from "../themes/index.js";

describe("theme-draft", () => {
  it("creates a draft with defaults", () => {
    const draft = createThemeDraft();
    expect(draft.label).toBe("My theme");
    expect(draft.extends).toBe("default");
    expect(draft.color.seeds.neutral).toBeDefined();
  });

  it("sets and clears token overrides", () => {
    const draft = createThemeDraft();
    const withOverride = setTokenOverride(
      draft,
      "interaction",
      "interaction-hover-scale",
      "1.05",
    );
    expect(
      withOverride.tokenOverrides.interaction?.["interaction-hover-scale"],
    ).toBeDefined();

    const cleared = setTokenOverride(
      withOverride,
      "interaction",
      "interaction-hover-scale",
      null,
    );
    expect(
      cleared.tokenOverrides.interaction?.["interaction-hover-scale"],
    ).toBeUndefined();
  });

  it("converts draft to theme definition", () => {
    const draft = createThemeDraft({ label: "Test" });
    const definition = themeDraftToDefinition(draft, "custom-1");
    expect(definition.id).toBe("custom-1");
    expect(definition.label).toBe("Test");
    expect(definition.extends).toBe("default");
  });

  it("round-trips theme definitions and lists editable tokens", () => {
    const definition = themeDraftToDefinition(
      createThemeDraft({ label: "Saved", radiusFactor: 1.1 }),
      "custom-2",
    );
    const draft = definitionToThemeDraft(definition);

    expect(draft.label).toBe("Saved");
    expect(draft.radiusFactor).toBe(1.1);

    const resolved = resolveThemeDraft(draft);
    const tokens = listEditableTokens(draft, resolved);
    const grouped = listEditableTokensByLayer(draft, resolved);

    expect(tokens.length).toBeGreaterThan(0);
    expect(TOKEN_LAYER_ORDER.every((layer) => grouped[layer].length > 0)).toBe(
      true,
    );
  });

  it("updates color seeds and clears blank overrides", () => {
    const draft = setColorSeed(createThemeDraft(), "accent", "#123456");
    expect(draft.color.seeds?.accent).toBe("#123456");
    expect(COLOR_SEED_KEYS).toContain("accent");

    const withOverride = setTokenOverride(
      draft,
      "interaction",
      "interaction-hover-scale",
      "  ",
    );
    expect(
      withOverride.tokenOverrides.interaction?.["interaction-hover-scale"],
    ).toBeUndefined();
  });

  it("preserves override categories from resolved tokens", () => {
    const draft = setTokenOverride(
      createThemeDraft(),
      "foundation",
      "radius-sm",
      "4px",
    );
    const override = draft.tokenOverrides.foundation?.["radius-sm"];

    expect(override?.category).toBeDefined();
    expect(
      resolveThemeDraft(draft).tokens.foundation["radius-sm"],
    ).toBeDefined();
    expect(
      listEditableTokens(draft).find((token) => token.name === "radius-sm")
        ?.isOverride,
    ).toBe(true);
    expect(builtInThemes.default.label).toBeTruthy();
  });
});
