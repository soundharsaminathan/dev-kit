import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeLayerPreview } from "../ThemeLayerPreview";

describe("ThemeLayerPreview", () => {
  it.each([
    ["color", "Color preview"],
    ["foundation", "Foundation preview"],
    ["semantic", "Semantic preview"],
    ["effects", "Effects preview"],
    ["interaction", "Interaction preview"],
    ["components", "Components preview"],
  ] as const)("renders the %s preview section", (section, label) => {
    render(<ThemeLayerPreview section={section} />);

    expect(screen.getByLabelText(label)).toHaveAttribute(
      "data-section",
      section,
    );
  });
});
