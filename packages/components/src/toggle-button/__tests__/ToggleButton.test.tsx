import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToggleButtonGroup } from "../../toggle-button-group/ToggleButtonGroup";
import { ToggleButton } from "../ToggleButton";

describe("ToggleButton", () => {
  afterEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

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

  it("marks pressed state while the pointer is down", () => {
    render(<ToggleButton aria-label="Bold">Bold</ToggleButton>);
    const button = screen.getByRole("button", { name: "Bold" });

    fireEvent.pointerDown(button);
    expect(button).toHaveAttribute("data-pressed", "true");
  });

  it("enables motion press when CSS scale tokens are present", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (name: string) =>
        name === "--btn-hover-scale" ? "1.02" : "0.98",
    } as unknown as CSSStyleDeclaration);

    render(<ToggleButton aria-label="Bold">Bold</ToggleButton>);
    const button = screen.getByRole("button", { name: "Bold" });
    expect(button).toHaveAttribute("data-motion-press", "true");
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

  it("marks pressed state for group toggle buttons", () => {
    render(
      <ToggleButtonGroup>
        <ToggleButton id="bold" aria-label="Bold">
          Bold
        </ToggleButton>
      </ToggleButtonGroup>,
    );

    const button = screen.getByRole("radio", { name: "Bold" });
    fireEvent.pointerDown(button);
    expect(button).toHaveAttribute("data-pressed", "true");
  });
});
