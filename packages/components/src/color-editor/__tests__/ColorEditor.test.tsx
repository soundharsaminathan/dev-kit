import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorEditor } from "../ColorEditor";

describe("ColorEditor", () => {
  it("renders the color editor layout", () => {
    const { container } = render(<ColorEditor defaultValue="#6366f1" />);

    expect(container.querySelector("[data-color-editor]")).toBeTruthy();
    expect(container.querySelector("[data-color-area]")).toBeTruthy();
    expect(screen.getAllByRole("slider").length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: "Hex" })).toBeInTheDocument();
  });

  it("shows alpha slider when enabled", () => {
    render(<ColorEditor defaultValue="#6366f1" showAlphaChannel />);
    expect(screen.getByRole("slider", { name: "Alpha" })).toBeInTheDocument();
  });

  it("hides format selector when disabled", () => {
    render(<ColorEditor defaultValue="#6366f1" showFormatSelector={false} />);
    expect(
      screen.queryByRole("button", { name: "Color format" }),
    ).not.toBeInTheDocument();
  });
});
