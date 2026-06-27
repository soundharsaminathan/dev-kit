import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorWheel } from "../index";

describe("ColorWheel", () => {
  it("renders with data-color-wheel attribute", () => {
    const { container } = render(
      <ColorWheel aria-label="Hue" defaultValue="#6366f1" />,
    );

    expect(
      container.querySelector("[data-color-wheel='']"),
    ).toBeInTheDocument();
  });

  it("renders track by default", () => {
    const { container } = render(
      <ColorWheel aria-label="Hue" defaultValue="#6366f1" />,
    );

    expect(
      container.querySelector("[data-color-wheel-track='']"),
    ).toBeInTheDocument();
  });

  it("marks disabled state on the wheel and track", () => {
    const { container } = render(
      <ColorWheel aria-label="Hue" defaultValue="#6366f1" isDisabled />,
    );

    expect(container.querySelector("[data-color-wheel='']")).toHaveAttribute(
      "data-disabled",
      "true",
    );
    expect(
      container.querySelector("[data-color-wheel-track='']"),
    ).toHaveAttribute("data-disabled", "true");
  });

  it("renders custom children instead of the default track", () => {
    render(
      <ColorWheel aria-label="Hue" defaultValue="#6366f1">
        <span data-testid="custom-wheel">Custom</span>
      </ColorWheel>,
    );

    expect(screen.getByTestId("custom-wheel")).toBeInTheDocument();
  });
});
