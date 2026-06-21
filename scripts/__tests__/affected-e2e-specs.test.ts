import { describe, expect, it } from "vitest";
import {
  pascalToKebab,
  resolveAffectedE2eSpecs,
} from "./affected-e2e-specs.ts";

describe("pascalToKebab", () => {
  it("converts story names to spec file stems", () => {
    expect(pascalToKebab("Button")).toBe("button");
    expect(pascalToKebab("OTPField")).toBe("otp-field");
    expect(pascalToKebab("ToggleButtonGroup")).toBe("toggle-button-group");
  });
});

describe("resolveAffectedE2eSpecs", () => {
  it("runs all specs when tokens change", () => {
    const result = resolveAffectedE2eSpecs(["packages/tokens/src/theme.ts"]);
    expect(result.mode).toBe("all");
  });

  it("maps component source changes to a spec file", () => {
    const result = resolveAffectedE2eSpecs([
      "packages/components/src/button/Button.tsx",
    ]);
    expect(result).toEqual({
      mode: "specs",
      specs: ["button.spec.ts"],
    });
  });

  it("maps story file changes to a spec file", () => {
    const result = resolveAffectedE2eSpecs([
      "apps/storybook/stories/Modal.stories.tsx",
    ]);
    expect(result).toEqual({
      mode: "specs",
      specs: ["modal.spec.ts"],
    });
  });

  it("runs all specs when nx config changes", () => {
    const result = resolveAffectedE2eSpecs(["nx.json"]);
    expect(result.mode).toBe("all");
  });

  it("skips when no visual-relevant files changed", () => {
    const result = resolveAffectedE2eSpecs(["README.md"]);
    expect(result.mode).toBe("none");
  });
});
