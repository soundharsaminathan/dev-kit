import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
