import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckboxGroup } from "../../checkbox-group/CheckboxGroup";
import { Checkbox, CheckboxControl, CheckboxIndicator } from "../Checkbox";

describe("Checkbox", () => {
  it("renders a checkbox", () => {
    render(<Checkbox aria-label="Accept terms" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("renders with a string label", () => {
    render(<Checkbox>Accept terms</Checkbox>);
    expect(screen.getByText("Accept terms")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("toggles when clicked", () => {
    render(<Checkbox aria-label="Accept terms" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("renders compound children", () => {
    render(
      <Checkbox>
        <CheckboxControl aria-label="Accept terms" />
      </Checkbox>,
    );
    expect(
      screen.getByRole("checkbox", { name: "Accept terms" }),
    ).toBeInTheDocument();
  });

  it("renders a standalone indicator by wrapping it in control", () => {
    render(
      <CheckboxControl aria-label="Standalone">
        <CheckboxIndicator />
      </CheckboxControl>,
    );
    expect(
      screen.getByRole("checkbox", { name: "Standalone" }),
    ).toBeInTheDocument();
  });

  it("shows indeterminate state with minus icon", () => {
    render(<Checkbox isIndeterminate aria-label="Select all" />);
    const control = document.querySelector("[data-checkbox-control]")!;

    expect(control.querySelector("[data-indeterminate='true']")).toBeTruthy();
    expect(control.querySelector("svg")).toBeTruthy();
  });

  it("reflects selected, disabled, invalid, hover, and focus-visible states", () => {
    render(<Checkbox defaultSelected isInvalid aria-label="Accept terms" />);
    const control = document.querySelector("[data-checkbox-control]")!;

    expect(control.querySelector("[data-selected='true']")).toBeTruthy();
    expect(control.querySelector("[data-invalid='true']")).toBeTruthy();

    fireEvent.pointerEnter(control, { pointerType: "mouse" });
    expect(control.querySelector("[data-hovered='true']")).toBeTruthy();

    act(() => {
      screen.getByRole("checkbox").focus();
    });
    fireEvent.keyDown(screen.getByRole("checkbox"), { key: "Tab" });
    expect(control.querySelector("[data-focus-visible='true']")).toBeTruthy();
  });

  it("marks disabled state and skips hover feedback", () => {
    render(<Checkbox isDisabled aria-label="Accept terms" />);
    const control = document.querySelector("[data-checkbox-control]")!;

    expect(control).toHaveAttribute("data-disabled", "true");
    fireEvent.pointerEnter(control, { pointerType: "mouse" });
    expect(control.querySelector("[data-hovered='true']")).toBeNull();
  });

  it("renders in a checkbox group with group invalid state", () => {
    render(
      <CheckboxGroup aria-label="Features" isInvalid isDisabled>
        <Checkbox value="a">Option A</Checkbox>
      </CheckboxGroup>,
    );

    const control = document.querySelector("[data-checkbox-control]")!;
    expect(control).toHaveAttribute("data-disabled", "true");
    expect(control.querySelector("[data-invalid='true']")).toBeTruthy();
  });
});
