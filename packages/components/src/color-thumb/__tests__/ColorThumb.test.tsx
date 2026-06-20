import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorThumb } from "../ColorThumb";
import { ColorThumbContext } from "../color-thumb-context";

describe("ColorThumb", () => {
  it("renders with data-slot attribute", () => {
    const { container } = render(
      <ColorThumbContext.Provider
        value={{
          thumbProps: { style: { top: "50%", left: "50%" } },
          isDisabled: false,
          thumbColor: "#6366f1",
        }}
      >
        <ColorThumb />
      </ColorThumbContext.Provider>,
    );

    expect(container.querySelector('[data-slot="color-thumb"]')).toBeTruthy();
  });

  it("marks disabled state", () => {
    const { container } = render(
      <ColorThumbContext.Provider
        value={{
          thumbProps: {},
          isDisabled: true,
        }}
      >
        <ColorThumb />
      </ColorThumbContext.Provider>,
    );

    expect(
      container.querySelector('[data-slot="color-thumb"]'),
    ).toHaveAttribute("data-disabled", "true");
  });

  it("throws when used outside ColorArea or ColorSlider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ColorThumb />)).toThrow(
      "ColorThumb must be used within ColorArea or ColorSlider",
    );

    consoleError.mockRestore();
  });
});
