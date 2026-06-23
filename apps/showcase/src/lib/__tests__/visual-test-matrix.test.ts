import { describe, expect, it } from "vitest";
import { getAllRegistryEntries } from "@/registry";
import {
  generateVisualTestCases,
  generateVisualTestCasesForConfig,
} from "../visual-test-matrix";

describe("visual-test-matrix", () => {
  it("generates one default case per component with no visual controls", () => {
    const cases = generateVisualTestCasesForConfig({
      name: "Link",
      slug: "link",
      category: "typography",
      description: "Link",
      controls: [{ name: "children", type: "string", defaultValue: "Link" }],
    });

    expect(cases).toEqual([
      expect.objectContaining({
        slug: "link",
        caseId: "link",
        screenshotName: "playground-link.png",
      }),
    ]);
  });

  it("generates enum and boolean combinations", () => {
    const cases = generateVisualTestCasesForConfig({
      name: "Badge",
      slug: "badge",
      category: "typography",
      description: "Badge",
      controls: [
        {
          name: "variant",
          type: "enum",
          options: ["default", "primary"],
          defaultValue: "default",
        },
        { name: "disabled", type: "boolean", defaultValue: false },
      ],
    });

    expect(cases).toHaveLength(4);
    expect(cases.map((testCase) => testCase.caseId)).toEqual([
      "badge",
      "badge--disabled-true",
      "badge--variant-primary",
      "badge--disabled-true--variant-primary",
    ]);
  });

  it("covers every registry component", () => {
    const slugs = new Set(
      generateVisualTestCases().map((testCase) => testCase.slug),
    );
    for (const entry of getAllRegistryEntries()) {
      expect(slugs.has(entry.config.slug)).toBe(true);
    }
  });
});
