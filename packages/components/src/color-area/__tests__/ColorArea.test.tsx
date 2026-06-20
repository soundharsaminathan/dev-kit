import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorArea } from "../ColorArea";

describe("ColorArea", () => {
  it("renders a color area", () => {
    const { container } = render(
      <ColorArea
        defaultValue="#6366f1"
        aria-label="Saturation and brightness"
      />,
    );

    expect(container.querySelector("[data-color-area]")).toBeTruthy();
    expect(container.querySelector('[data-slot="color-thumb"]')).toBeTruthy();
  });

  it("marks disabled state", () => {
    const { container } = render(
      <ColorArea defaultValue="#6366f1" aria-label="Color area" isDisabled />,
    );

    expect(container.querySelector("[data-color-area]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("exposes channel inputs to assistive technologies", () => {
    render(<ColorArea defaultValue="#6366f1" aria-label="Color area" />);
    expect(screen.getAllByRole("slider").length).toBeGreaterThan(0);
  });
});
