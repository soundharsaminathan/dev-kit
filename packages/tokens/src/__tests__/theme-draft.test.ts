import { describe, expect, it } from "vitest";
import {
  COLOR_SEED_KEYS,
  createThemeDraft,
  definitionToThemeDraft,
  listEditableTokens,
  listEditableTokensByLayer,
  listEditableTokensForLayer,
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

  it("stores radiusFactor when provided at creation", () => {
    const draft = createThemeDraft({ radiusFactor: 1.25 });
    expect(draft.radiusFactor).toBe(1.25);
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
    const interactionTokens = listEditableTokensForLayer(
      draft,
      "interaction",
      resolved,
    );

    expect(tokens.length).toBeGreaterThan(0);
    expect(TOKEN_LAYER_ORDER.every((layer) => grouped[layer].length > 0)).toBe(
      true,
    );
    expect(interactionTokens).toEqual(grouped.interaction);
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

  it("round-trips fonts through draft and definition conversions", () => {
    const fonts = { sans: "Inter", mono: "JetBrains Mono" };
    const draft = createThemeDraft({ label: "Fonted", fonts });
    expect(draft.fonts).toEqual(fonts);

    const definition = themeDraftToDefinition(draft, "custom-fonts");
    expect(definition.fonts).toEqual(fonts);

    const roundTripped = definitionToThemeDraft(definition);
    expect(roundTripped.fonts).toEqual(fonts);
  });

  it("resolves non-value override targets through resolveTarget", () => {
    const draft = createThemeDraft();
    const withRefOverride = {
      ...draft,
      tokenOverrides: {
        ...draft.tokenOverrides,
        foundation: {
          "radius-sm": {
            target: { ref: "accent-500" },
            category: "foundation" as const,
          },
        },
      },
    };

    const tokens = listEditableTokensForLayer(withRefOverride, "foundation");
    const radiusToken = tokens.find((token) => token.name === "radius-sm");

    expect(radiusToken?.overrideValue).toBe("var(--accent-500)");
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
