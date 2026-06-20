import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Description, Field, FieldError, Label } from "../../field/Field";
import { TextArea } from "../TextArea";

describe("TextArea", () => {
  it("renders a textbox", () => {
    render(<TextArea aria-label="Message" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("applies textarea data attributes", () => {
    render(<TextArea aria-label="Message" size="lg" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("data-textarea", "");
    expect(textarea).toHaveAttribute("data-size", "lg");
  });

  it("marks disabled state", () => {
    render(<TextArea aria-label="Message" isDisabled />);
    const textarea = screen.getByRole("textbox");

    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute("data-disabled", "true");
  });

  it("reflects focus-visible state", () => {
    render(<TextArea aria-label="Message" />);
    const textarea = screen.getByRole("textbox");

    act(() => {
      textarea.focus();
    });
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(textarea).toHaveAttribute("data-focus-visible", "true");
  });

  it("uses field context ids and aria wiring", () => {
    render(
      <Field>
        <Label>Message</Label>
        <Description>Your message</Description>
        <TextArea />
        <FieldError>Message is required</FieldError>
      </Field>,
    );

    const textarea = screen.getByRole("textbox", { name: "Message" });
    const description = screen.getByText("Your message");
    const error = screen.getByRole("alert");

    expect(textarea.getAttribute("id")).toBeTruthy();
    expect(textarea.getAttribute("aria-describedby")).toContain(
      description.getAttribute("id"),
    );
    expect(textarea.getAttribute("aria-errormessage")).toBe(
      error.getAttribute("id"),
    );
  });
});
