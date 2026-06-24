import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverlayArrow } from "../index";

describe("OverlayArrow", () => {
  it("renders with data-overlay-arrow attribute", () => {
    const { container } = render(<OverlayArrow placement="bottom" />);
    expect(
      container.querySelector("[data-overlay-arrow='']"),
    ).toBeInTheDocument();
  });

  it("sets data-placement from placement prop", () => {
    const { container } = render(<OverlayArrow placement="top" />);
    expect(container.querySelector("[data-overlay-arrow='']")).toHaveAttribute(
      "data-placement",
      "top",
    );
  });
});
