import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ColorSlider,
  ColorSliderControl,
  ColorSliderOutput,
} from "../ColorSlider";

describe("ColorSlider", () => {
  it("renders a color slider", () => {
    render(
      <ColorSlider
        defaultValue="#6366f1"
        channel="hue"
        colorSpace="hsb"
        aria-label="Hue"
      />,
    );

    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders control and output elements", () => {
    const { container } = render(
      <ColorSlider
        defaultValue="#6366f1"
        channel="hue"
        colorSpace="hsb"
        aria-label="Hue"
      />,
    );

    expect(container.querySelector("[data-color-slider-control]")).toBeTruthy();
    expect(container.querySelector("[data-color-slider-output]")).toBeTruthy();
  });

  it("marks disabled state", () => {
    const { container } = render(
      <ColorSlider
        defaultValue="#6366f1"
        channel="hue"
        colorSpace="hsb"
        aria-label="Hue"
        isDisabled
      />,
    );

    expect(
      container.querySelector("[data-color-slider-control]"),
    ).toHaveAttribute("data-disabled", "true");
  });

  it("throws when ColorSliderControl is used outside ColorSlider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ColorSliderControl />)).toThrow(
      "ColorSliderControl must be used within ColorSlider",
    );

    consoleError.mockRestore();
  });

  it("throws when ColorSliderOutput is used outside ColorSlider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ColorSliderOutput />)).toThrow(
      "ColorSliderOutput must be used within ColorSlider",
    );

    consoleError.mockRestore();
  });
});
