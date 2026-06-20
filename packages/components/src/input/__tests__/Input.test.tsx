import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Description, Field, FieldError, Label } from "../../field/Field";
import { OTPField } from "../../otp-field/OTPField";
import { Input } from "../Input";

describe("Input", () => {
  it("renders a textbox", () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("applies size data attribute", () => {
    render(<Input aria-label="Name" size="lg" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("data-size", "lg");
  });

  it("defaults to md size", () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("data-size", "md");
  });

  it("marks disabled state", () => {
    render(<Input aria-label="Name" isDisabled />);
    const input = screen.getByRole("textbox");

    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("data-disabled", "true");
  });

  it("reflects focus-visible state", () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByRole("textbox");

    act(() => {
      input.focus();
    });
    fireEvent.keyDown(input, { key: "Tab" });

    expect(input).toHaveAttribute("data-focus-visible", "true");
  });

  it("uses field context ids and aria wiring", () => {
    render(
      <Field>
        <Label>Name</Label>
        <Description>Your full name</Description>
        <Input />
        <FieldError>Name is required</FieldError>
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "Name" });
    const description = screen.getByText("Your full name");
    const error = screen.getByRole("alert");

    expect(input.getAttribute("id")).toBeTruthy();
    expect(input.getAttribute("aria-describedby")).toContain(
      description.getAttribute("id"),
    );
    expect(input.getAttribute("aria-errormessage")).toBe(
      error.getAttribute("id"),
    );
  });

  it("renders otp cells when used inside OTPField", () => {
    render(<OTPField length={3} aria-label="Verification code" />);

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(3);
    expect(inputs[0]).toHaveAttribute("data-input-control", "");
  });
});
