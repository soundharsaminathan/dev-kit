import "@testing-library/jest-dom/vitest";
import { parseColor } from "@react-stately/color";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorSwatchPicker, ColorSwatchPickerItem } from "../ColorSwatchPicker";

describe("ColorSwatchPicker", () => {
  it("renders swatch picker items", () => {
    const { container } = render(
      <ColorSwatchPicker defaultValue="#6366f1" aria-label="Colors">
        <ColorSwatchPickerItem color="#6366f1" />
        <ColorSwatchPickerItem color="#ef4444" />
      </ColorSwatchPicker>,
    );

    expect(container.querySelector("[data-color-swatch-picker]")).toBeTruthy();
    expect(
      container.querySelectorAll("[data-color-swatch-picker-item]"),
    ).toHaveLength(2);
  });

  it("selects a color when an item is clicked", () => {
    const onChange = vi.fn();
    render(
      <ColorSwatchPicker
        defaultValue={parseColor("#6366f1")}
        onChange={onChange}
        aria-label="Colors"
      >
        <ColorSwatchPickerItem color="#6366f1" />
        <ColorSwatchPickerItem color="#ef4444" />
      </ColorSwatchPicker>,
    );

    const items = screen.getAllByRole("radio");
    fireEvent.click(items[1]!);

    expect(onChange).toHaveBeenCalled();
    expect(items[1]).toHaveAttribute("aria-checked", "true");
  });

  it("renders decorative swatches without nested focus targets", () => {
    const { container } = render(
      <ColorSwatchPicker defaultValue="#6366f1" aria-label="Colors">
        <ColorSwatchPickerItem color="#6366f1" />
      </ColorSwatchPicker>,
    );

    const swatch = container.querySelector('[data-slot="color-swatch"]');
    expect(swatch).toHaveAttribute("aria-hidden", "true");
    expect(swatch).not.toHaveAttribute("tabindex");
  });

  it("moves selection with arrow keys", () => {
    render(
      <ColorSwatchPicker defaultValue="#6366f1" aria-label="Colors">
        <ColorSwatchPickerItem color="#6366f1" />
        <ColorSwatchPickerItem color="#ef4444" />
        <ColorSwatchPickerItem color="#22c55e" />
      </ColorSwatchPicker>,
    );

    const group = screen.getByRole("radiogroup");
    const items = screen.getAllByRole("radio");
    items[0]?.focus();

    fireEvent.keyDown(group, { key: "ArrowRight" });

    expect(items[1]).toHaveAttribute("aria-checked", "true");
  });

  it("throws when item is used outside picker", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ColorSwatchPickerItem color="#6366f1" />)).toThrow(
      "ColorSwatchPickerItem must be used within ColorSwatchPicker",
    );

    consoleError.mockRestore();
  });
});
