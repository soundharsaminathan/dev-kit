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

  it("positions arrows for each side", () => {
    for (const placement of ["top", "bottom", "left", "right"] as const) {
      const { container } = render(<OverlayArrow placement={placement} />);
      const arrow = container.querySelector(
        "[data-overlay-arrow='']",
      ) as HTMLElement;

      expect(arrow).toHaveAttribute("data-placement", placement);
      expect(arrow.style[placement]).toBe("100%");
    }
  });

  it("uses horizontal transforms for top and bottom placements", () => {
    const { container: topContainer } = render(
      <OverlayArrow placement="top" />,
    );
    const { container: leftContainer } = render(
      <OverlayArrow placement="left" />,
    );

    expect(
      (topContainer.querySelector("[data-overlay-arrow='']") as HTMLElement)
        .style.transform,
    ).toContain("translateX(-50%)");
    expect(
      (leftContainer.querySelector("[data-overlay-arrow='']") as HTMLElement)
        .style.transform,
    ).toContain("translateY(-50%)");
  });

  it("centers top and bottom arrows horizontally", () => {
    const { container } = render(<OverlayArrow placement="top" />);
    const arrow = container.querySelector(
      "[data-overlay-arrow='']",
    ) as HTMLElement;

    expect(arrow.style.left).toBe("50%");
    expect(arrow.style.top).toBe("100%");
  });

  it("centers left and right arrows vertically", () => {
    const { container } = render(<OverlayArrow placement="right" />);
    const arrow = container.querySelector(
      "[data-overlay-arrow='']",
    ) as HTMLElement;

    expect(arrow.style.top).toBe("50%");
    expect(arrow.style.right).toBe("100%");
  });

  it("merges custom styles", () => {
    const { container } = render(
      <OverlayArrow placement="bottom" style={{ opacity: 0.5 }} />,
    );
    const arrow = container.querySelector(
      "[data-overlay-arrow='']",
    ) as HTMLElement;

    expect(arrow.style.opacity).toBe("0.5");
    expect(arrow.style.bottom).toBe("100%");
  });

  it("defaults to bottom placement", () => {
    const { container } = render(<OverlayArrow />);
    const arrow = container.querySelector(
      "[data-overlay-arrow='']",
    ) as HTMLElement;

    expect(arrow).toHaveAttribute("data-placement", "bottom");
    expect(arrow.style.bottom).toBe("100%");
  });

  it("omits side offset for unsupported placements", () => {
    const { container } = render(<OverlayArrow placement={null} />);
    const arrow = container.querySelector(
      "[data-overlay-arrow='']",
    ) as HTMLElement;

    expect(arrow).not.toHaveAttribute("data-placement");
    expect(arrow.style.top).toBe("");
    expect(arrow.style.bottom).toBe("");
    expect(arrow.style.transform).toContain("translateY(-50%)");
  });
});
