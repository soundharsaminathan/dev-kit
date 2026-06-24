import { describe, expect, it } from "vitest";
import {
  createThemeDraft,
  setTokenOverride,
  themeDraftToDefinition,
} from "../theme/theme-draft.js";

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
});
