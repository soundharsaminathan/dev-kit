import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Field, FieldError, Label } from "../../field/Field";
import { TextField } from "../../text-field/TextField";
import { Form } from "../index";

describe("Form", () => {
  it("renders with data-form attribute", () => {
    const { container } = render(
      <Form aria-label="Sign in">
        <TextField name="email">
          <Label>Email</Label>
        </TextField>
      </Form>,
    );

    expect(container.querySelector("[data-form='']")).toBeInTheDocument();
  });

  it("submits via onSubmit", () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <Form aria-label="Sign in" onSubmit={onSubmit}>
        <button type="submit">Submit</button>
      </Form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows validation errors from context", () => {
    render(
      <Form
        aria-label="Sign in"
        validationBehavior="aria"
        validationErrors={{ email: "Email is required" }}
      >
        <Field name="email">
          <Label>Email</Label>
          <FieldError />
        </Field>
      </Form>,
    );

    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });
});
