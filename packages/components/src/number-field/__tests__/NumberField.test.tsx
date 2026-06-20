import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Description, FieldError, Label } from "../../field/Field";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "../NumberField";

describe("NumberField", () => {
  it("renders a number field input", () => {
    render(<NumberField aria-label="Quantity" defaultValue={5} />);
    expect(
      screen.getByRole("textbox", { name: "Quantity" }),
    ).toBeInTheDocument();
  });

  it("renders increment and decrement buttons", () => {
    render(<NumberField aria-label="Quantity" defaultValue={5} />);
    expect(
      screen.getByRole("button", { name: "Increase Quantity" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Decrease Quantity" }),
    ).toBeInTheDocument();
  });

  it("does not reference missing aria ids", () => {
    render(<NumberField aria-label="Quantity" defaultValue={5} />);
    const input = screen.getByRole("textbox", { name: "Quantity" });
    expect(input).not.toHaveAttribute("aria-errormessage");
    expect(input).not.toHaveAttribute("aria-describedby");

    const inputId = input.getAttribute("id");
    for (const button of screen.getAllByRole("button")) {
      expect(button.getAttribute("aria-controls")).toBe(inputId);
    }
  });

  it("wires field description and error ids to the input", () => {
    render(
      <NumberField defaultValue={5} isInvalid>
        <Label>Quantity</Label>
        <Description>Enter a whole number</Description>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
        <FieldError>Required</FieldError>
      </NumberField>,
    );

    const input = screen.getByRole("textbox", { name: "Quantity" });
    expect(input.getAttribute("aria-describedby")).toContain(
      screen.getByText("Enter a whole number").getAttribute("id"),
    );
    expect(input.getAttribute("aria-errormessage")).toBe(
      screen.getByRole("alert").getAttribute("id"),
    );
  });

  it("increments and decrements the value", () => {
    render(<NumberField aria-label="Quantity" defaultValue={5} />);
    const input = screen.getByRole("textbox", { name: "Quantity" });

    fireEvent.click(screen.getByRole("button", { name: "Increase Quantity" }));
    expect(input).toHaveValue("6");

    fireEvent.click(screen.getByRole("button", { name: "Decrease Quantity" }));
    expect(input).toHaveValue("5");
  });

  it("marks disabled and invalid states on the group and input", () => {
    render(
      <NumberField
        aria-label="Quantity"
        defaultValue={5}
        isDisabled
        isInvalid
      />,
    );

    expect(document.querySelector("[data-number-field-group]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
    expect(document.querySelector("[data-number-field-group]")).toHaveAttribute(
      "data-invalid",
      "true",
    );
    expect(document.querySelector("[data-number-field-input]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("renders custom compound children and button content", () => {
    render(
      <NumberField aria-label="Quantity" defaultValue={5}>
        <NumberFieldGroup>
          <NumberFieldDecrement>-</NumberFieldDecrement>
          <NumberFieldInput />
          <NumberFieldIncrement>+</NumberFieldIncrement>
        </NumberFieldGroup>
      </NumberField>,
    );

    expect(
      screen.getByRole("button", { name: "Decrease Quantity" }),
    ).toHaveTextContent("-");
    expect(
      screen.getByRole("button", { name: "Increase Quantity" }),
    ).toHaveTextContent("+");
  });

  it("throws when NumberFieldGroup is used outside NumberField", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<NumberFieldGroup />)).toThrow(
      "NumberFieldGroup must be used within NumberField",
    );

    consoleError.mockRestore();
  });

  it("throws when NumberFieldInput is used outside NumberField", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<NumberFieldInput />)).toThrow(
      "NumberFieldInput must be used within NumberField",
    );

    consoleError.mockRestore();
  });

  it("throws when NumberFieldDecrement is used outside NumberField", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<NumberFieldDecrement />)).toThrow(
      "NumberFieldDecrement must be used within NumberField",
    );

    consoleError.mockRestore();
  });

  it("throws when NumberFieldIncrement is used outside NumberField", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<NumberFieldIncrement />)).toThrow(
      "NumberFieldIncrement must be used within NumberField",
    );

    consoleError.mockRestore();
  });
});
