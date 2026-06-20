import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToggleButton } from "../../toggle-button/ToggleButton";
import {
  ToggleButtonGroup,
  useToggleButtonGroupContext,
} from "../ToggleButtonGroup";

function ContextReader() {
  const { variant, size, isIconOnly } = useToggleButtonGroupContext("Test");
  return (
    <span data-testid="context">
      {variant}-{size}-{String(isIconOnly)}
    </span>
  );
}

describe("ToggleButtonGroup", () => {
  it("selects toggle buttons in single selection mode", () => {
    render(
      <ToggleButtonGroup selectionMode="single" defaultSelectedKeys={["bold"]}>
        <ToggleButton id="bold">Bold</ToggleButton>
        <ToggleButton id="italic">Italic</ToggleButton>
      </ToggleButtonGroup>,
    );

    expect(screen.getByRole("radio", { name: "Bold" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("radio", { name: "Italic" }));
    expect(screen.getByRole("radio", { name: "Italic" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("applies group layout attributes", () => {
    render(
      <ToggleButtonGroup orientation="vertical" variant="primary" size="sm">
        <ToggleButton id="bold">Bold</ToggleButton>
      </ToggleButtonGroup>,
    );

    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("data-toggle-button-group", "");
    expect(group).toHaveAttribute("data-orientation", "vertical");
  });

  it("provides context to descendants", () => {
    render(
      <ToggleButtonGroup variant="quiet" size="lg" isIconOnly>
        <ContextReader />
      </ToggleButtonGroup>,
    );

    expect(screen.getByTestId("context")).toHaveTextContent("quiet-lg-true");
  });

  it("throws when useToggleButtonGroupContext is used outside the group", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ContextReader />)).toThrow(
      "Test must be used within ToggleButtonGroup",
    );

    consoleError.mockRestore();
  });
});
