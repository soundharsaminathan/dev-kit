import "@testing-library/jest-dom/vitest";
import { useColorPickerState } from "@react-stately/color";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ColorPickerStateContext } from "../../color-context";
import { ColorSwatch } from "../ColorSwatch";

describe("ColorSwatch", () => {
  it("renders with data-slot attribute", () => {
    const { container } = render(<ColorSwatch color="#6366f1" />);
    expect(container.querySelector('[data-slot="color-swatch"]')).toBeTruthy();
  });

  it("applies checkerboard background style", () => {
    const { container } = render(<ColorSwatch color="#6366f1" />);
    const swatch = container.querySelector(
      '[data-slot="color-swatch"]',
    ) as HTMLElement;
    expect(swatch.style.background).toContain("repeating-conic-gradient");
  });

  it("uses picker state color when no color prop is provided", () => {
    function Wrapper({ children }: { children: React.ReactNode }) {
      const pickerState = useColorPickerState({ defaultValue: "#22c55e" });
      return createElement(
        ColorPickerStateContext.Provider,
        { value: pickerState },
        children,
      );
    }

    const { container } = render(
      <Wrapper>
        <ColorSwatch />
      </Wrapper>,
    );
    const swatch = container.querySelector(
      '[data-slot="color-swatch"]',
    ) as HTMLElement;

    expect(swatch.style.background).toContain("rgb");
  });

  it("falls back to black when no color or picker state is available", () => {
    const { container } = render(<ColorSwatch />);
    const swatch = container.querySelector(
      '[data-slot="color-swatch"]',
    ) as HTMLElement;

    expect(swatch.style.background).toContain("rgb(0, 0, 0");
  });
});
