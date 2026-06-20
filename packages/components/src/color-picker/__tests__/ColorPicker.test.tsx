import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorPicker } from "../ColorPicker";

describe("ColorPicker", () => {
  it("renders a color picker trigger", () => {
    const { container } = render(
      <ColorPicker defaultValue="#6366f1" aria-label="Pick color" />,
    );

    expect(container.querySelector("[data-color-picker]")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Pick color" }),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-slot="color-swatch"]')).toBeTruthy();
  });

  it("opens the picker dialog when the trigger is clicked", () => {
    render(<ColorPicker defaultValue="#6366f1" aria-label="Pick color" />);

    fireEvent.click(screen.getByRole("button", { name: "Pick color" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
