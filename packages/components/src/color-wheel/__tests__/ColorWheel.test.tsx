import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
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
});
