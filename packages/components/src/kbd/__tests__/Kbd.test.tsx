import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Kbd, KbdGroup } from "../Kbd";

describe("Kbd", () => {
  it("renders a kbd element", () => {
    render(<Kbd>K</Kbd>);
    expect(screen.getByText("K")).toHaveAttribute("data-kbd", "");
  });
});

describe("KbdGroup", () => {
  it("renders grouped keys", () => {
    render(
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );
    expect(
      screen.getByText("⌘").closest("[data-kbd-group]"),
    ).toBeInTheDocument();
  });
});
