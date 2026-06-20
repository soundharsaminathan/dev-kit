import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label } from "../../field/Field";
import {
  DatePicker,
  DatePickerPopover,
  DatePickerTrigger,
  DateRangePicker,
  DateRangePickerPopover,
  DateRangePickerTrigger,
} from "../DatePicker";

describe("DatePicker", () => {
  it("renders a date picker trigger", () => {
    render(<DatePicker aria-label="Event date" />);
    expect(document.querySelector("[data-date-picker]")).toBeInTheDocument();
    expect(
      document.querySelector("[data-date-picker-trigger]"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("opens the calendar popover when the button is clicked", () => {
    render(<DatePicker aria-label="Event date" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders with compound children", () => {
    render(
      <DatePicker>
        <Label>Event date</Label>
        <DatePickerTrigger />
        <DatePickerPopover />
      </DatePicker>,
    );
    expect(screen.getByText("Event date")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });
});

describe("DateRangePicker", () => {
  it("renders a range date picker trigger", () => {
    render(<DateRangePicker aria-label="Trip dates" />);
    expect(
      document.querySelector("[data-date-picker-trigger]"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-date-picker-start-input]"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-date-picker-end-input]"),
    ).toBeInTheDocument();
  });

  it("opens the range calendar when the button is clicked", () => {
    render(
      <DateRangePicker aria-label="Trip dates">
        <DateRangePickerTrigger />
        <DateRangePickerPopover />
      </DateRangePicker>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("application")).toHaveAttribute(
      "data-range-calendar",
      "",
    );
  });
});
