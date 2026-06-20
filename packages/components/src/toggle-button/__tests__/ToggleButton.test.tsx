import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToggleButtonGroup } from "../../toggle-button-group/ToggleButtonGroup";
import { ToggleButton } from "../ToggleButton";

describe("ToggleButton", () => {
  it("renders a toggle button", () => {
    render(<ToggleButton aria-label="Bold">Bold</ToggleButton>);
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
  });

  it("toggles selected state", () => {
    render(<ToggleButton aria-label="Bold">Bold</ToggleButton>);
    const button = screen.getByRole("button", { name: "Bold" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-selected", "true");
  });

  it("applies variant, size, and icon-only attributes", () => {
    render(
      <ToggleButton aria-label="Bold" variant="primary" size="sm" isIconOnly>
        B
      </ToggleButton>,
    );

    const button = screen.getByRole("button", { name: "Bold" });
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(button).toHaveAttribute("data-size", "sm");
    expect(button).toHaveAttribute("data-icon-only", "true");
  });

  it("marks disabled and interaction states", () => {
    render(
      <ToggleButton aria-label="Bold" isDisabled defaultSelected>
        Bold
      </ToggleButton>,
    );

    const button = screen.getByRole("button", { name: "Bold" });
    expect(button).toHaveAttribute("data-disabled", "true");
    expect(button).toHaveAttribute("data-selected", "true");
    expect(button).toBeDisabled();
  });

  it("renders non-string children without wrapping", () => {
    render(
      <ToggleButton aria-label="Bold">
        <span data-testid="custom-child">B</span>
      </ToggleButton>,
    );

    expect(screen.getByTestId("custom-child")).toBeInTheDocument();
    expect(
      document.querySelector("[data-toggle-button] .label"),
    ).not.toBeInTheDocument();
  });

  it("reflects hover and focus-visible states", () => {
    render(<ToggleButton aria-label="Bold">Bold</ToggleButton>);
    const button = screen.getByRole("button", { name: "Bold" });

    fireEvent.pointerEnter(button, { pointerType: "mouse" });
    expect(button).toHaveAttribute("data-hovered", "true");

    act(() => {
      button.focus();
    });
    fireEvent.keyDown(button, { key: "Tab" });
    expect(button).toHaveAttribute("data-focus-visible", "true");
  });

  it("inherits group styling when rendered inside ToggleButtonGroup", () => {
    render(
      <ToggleButtonGroup variant="quiet" size="lg" isIconOnly>
        <ToggleButton id="bold" aria-label="Bold">
          Bold
        </ToggleButton>
      </ToggleButtonGroup>,
    );

    const button = screen.getByRole("radio", { name: "Bold" });
    expect(button).toHaveAttribute("data-variant", "quiet");
    expect(button).toHaveAttribute("data-size", "lg");
    expect(button).toHaveAttribute("data-icon-only", "true");
  });
});
