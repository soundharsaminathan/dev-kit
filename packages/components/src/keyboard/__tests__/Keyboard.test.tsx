import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Keyboard } from "../index";

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
});
