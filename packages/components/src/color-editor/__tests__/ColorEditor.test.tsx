import "@testing-library/jest-dom/vitest";
import { parseColor } from "@react-stately/color";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("switches to rgb channel fields", () => {
    render(<ColorEditor defaultValue="#6366f1" />);

    fireEvent.click(screen.getByRole("button", { name: /Color format/i }));
    fireEvent.click(screen.getByRole("option", { name: "RGB" }));

    expect(screen.getByRole("textbox", { name: "red" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "green" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "blue" })).toBeInTheDocument();
  });

  it("switches to hsl channel fields", () => {
    render(<ColorEditor defaultValue="#6366f1" />);

    fireEvent.click(screen.getByRole("button", { name: /Color format/i }));
    fireEvent.click(screen.getByRole("option", { name: "HSL" }));

    expect(screen.getByRole("textbox", { name: "hue" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "saturation" }),
    ).toBeInTheDocument();
  });

  it("accepts controlled value and onChange props", () => {
    const onChange = vi.fn();
    render(
      <ColorEditor
        value={parseColor("#6366f1")}
        onChange={onChange}
        showFormatSelector={false}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Hex" })).toBeInTheDocument();
  });

  it("switches to hsb channel fields", () => {
    render(<ColorEditor defaultValue="#6366f1" />);

    fireEvent.click(screen.getByRole("button", { name: /Color format/i }));
    fireEvent.click(screen.getByRole("option", { name: "HSB" }));

    expect(
      screen.getByRole("textbox", { name: "saturation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "brightness" }),
    ).toBeInTheDocument();
  });
});
