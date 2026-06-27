import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Keyboard, KeyboardGroup } from "../index";

describe("Keyboard", () => {
  it("renders keyboard shortcut text", () => {
    render(<Keyboard>Ctrl</Keyboard>);
    expect(screen.getByText("Ctrl")).toBeInTheDocument();
  });

  it("renders with data-keyboard attribute and ltr direction", () => {
    const { container } = render(<Keyboard>⌘</Keyboard>);
    const key = container.querySelector("[data-keyboard='']");
    expect(key).toBeInTheDocument();
    expect(key).toHaveAttribute("dir", "ltr");
  });

  it("renders grouped keyboard shortcuts", () => {
    const { container } = render(
      <KeyboardGroup className="shortcut-group">
        <Keyboard>Ctrl</Keyboard>
        <Keyboard>K</Keyboard>
      </KeyboardGroup>,
    );

    expect(
      container.querySelector("[data-keyboard-group='']"),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-keyboard-group='']")).toHaveClass(
      "shortcut-group",
    );
  });
});
