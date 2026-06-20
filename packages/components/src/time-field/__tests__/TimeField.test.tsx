import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldError, Label } from "../../field/Field";
import { TimeField } from "../TimeField";

describe("TimeField", () => {
  it("renders a time field with segments", () => {
    render(<TimeField aria-label="Meeting time" />);
    expect(
      screen.getByRole("group", { name: "Meeting time" }),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-time-field]")).toBeInTheDocument();
    expect(document.querySelector("[data-date-input]")).toBeInTheDocument();
  });

  it("renders with label element", () => {
    render(
      <TimeField>
        <Label>Meeting time</Label>
      </TimeField>,
    );
    expect(screen.getByText("Meeting time")).toBeInTheDocument();
  });

  it("wires field error message", () => {
    render(
      <TimeField isInvalid>
        <Label>Meeting time</Label>
        <FieldError>Time is required</FieldError>
      </TimeField>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Time is required");
  });

  it("sets disabled state on the input", () => {
    render(<TimeField aria-label="Meeting time" isDisabled />);
    expect(document.querySelector("[data-date-input]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });
});
