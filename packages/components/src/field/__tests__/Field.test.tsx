import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "../../input/Input";
import {
  Description,
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  Fieldset,
  Label,
  Legend,
} from "../Field";

describe("Field", () => {
  it("associates label and input", () => {
    render(
      <Field>
        <Label>Email</Label>
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox");
    const label = screen.getByText("Email");
    expect(input).toHaveAttribute("id");
    expect(label).toHaveAttribute("for", input.getAttribute("id"));
  });

  it("wires description id to input", () => {
    render(
      <Field>
        <Label>Email</Label>
        <Description>We never share your email.</Description>
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox");
    const description = screen.getByText("We never share your email.");
    expect(input.getAttribute("aria-describedby")).toContain(
      description.getAttribute("id"),
    );
  });

  it("renders field error when provided", () => {
    render(
      <Field>
        <Label>Email</Label>
        <Input />
        <FieldError>Email is required</FieldError>
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Email is required");
  });

  it("does not set aria-errormessage without field error", () => {
    render(
      <Field>
        <Label>Email</Label>
        <Input />
      </Field>,
    );
    expect(screen.getByRole("textbox")).not.toHaveAttribute(
      "aria-errormessage",
    );
  });

  it("sets aria-errormessage when field error is present", () => {
    render(
      <Field>
        <Label>Email</Label>
        <Input />
        <FieldError>Email is required</FieldError>
      </Field>,
    );

    const input = screen.getByRole("textbox");
    const error = screen.getByRole("alert");
    expect(input.getAttribute("aria-errormessage")).toBe(
      error.getAttribute("id"),
    );
  });

  it("returns null for empty field error content", () => {
    render(
      <Field>
        <Label>Email</Label>
        <Input />
        <FieldError>{null}</FieldError>
      </Field>,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("applies horizontal orientation", () => {
    render(
      <Field orientation="horizontal" data-testid="field">
        <Label>Email</Label>
        <Input />
      </Field>,
    );

    expect(screen.getByTestId("field")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );
  });

  it("renders fieldset, legend, group, and content slots", () => {
    render(
      <Fieldset>
        <Legend>Account</Legend>
        <FieldGroup data-testid="field-group">
          <FieldContent data-testid="field-content">
            <Label htmlFor="name-input">Name</Label>
            <Input id="name-input" aria-label="Name" />
          </FieldContent>
        </FieldGroup>
      </Fieldset>,
    );

    expect(document.querySelector("[data-slot='fieldset']")).toBeTruthy();
    expect(document.querySelector("[data-slot='legend']")).toHaveTextContent(
      "Account",
    );
    expect(screen.getByTestId("field-group")).toBeInTheDocument();
    expect(screen.getByTestId("field-content")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "name-input");
  });
});
