import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldError, Label } from "../../field/Field";
import { DateField } from "../DateField";

describe("DateField", () => {
  it("renders a date field with segments", () => {
    render(<DateField aria-label="Event date" />);
    expect(
      screen.getByRole("group", { name: "Event date" }),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-date-field]")).toBeInTheDocument();
    expect(document.querySelector("[data-date-input]")).toBeInTheDocument();
  });

  it("renders with label element", () => {
    render(
      <DateField>
        <Label>Event date</Label>
      </DateField>,
    );
    expect(screen.getByText("Event date")).toBeInTheDocument();
  });

  it("wires field error message", () => {
    render(
      <DateField isInvalid>
        <Label>Event date</Label>
        <FieldError>Date is required</FieldError>
      </DateField>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Date is required");
  });

  it("sets disabled state on the input", () => {
    render(<DateField aria-label="Event date" isDisabled />);
    expect(document.querySelector("[data-date-input]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("renders description and error message props", () => {
    render(
      <DateField
        aria-label="Event date"
        description="Use your local timezone"
        errorMessage="Date is required"
        isInvalid
      />,
    );

    expect(screen.getByText("Use your local timezone")).toBeInTheDocument();
    expect(screen.getByText("Date is required")).toBeInTheDocument();
  });

  it("renders a label prop without a Label child", () => {
    render(<DateField label="Event date" />);
    expect(screen.getByText("Event date")).toBeInTheDocument();
  });
});
