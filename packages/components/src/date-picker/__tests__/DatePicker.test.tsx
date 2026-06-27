import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("throws when subcomponents render outside DatePicker", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<DatePickerTrigger />)).toThrow(
      "DatePickerTrigger must be used within DatePicker",
    );

    consoleError.mockRestore();
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

  it("renders default layout without compound children", () => {
    render(<DateRangePicker aria-label="Trip dates" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("application")).toHaveAttribute(
      "data-range-calendar",
      "",
    );
  });

  it("throws when range subcomponents render outside DateRangePicker", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<DateRangePickerTrigger />)).toThrow(
      "DateRangePickerTrigger must be used within DateRangePicker",
    );

    consoleError.mockRestore();
  });

  it("renders with declarative label, description, and error message", () => {
    render(
      <DateRangePicker
        label="Trip"
        description="Select travel dates"
        errorMessage="Required"
        isInvalid
      />,
    );

    expect(screen.getByText("Trip")).toBeInTheDocument();
    expect(screen.getByText("Select travel dates")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});

describe("DatePicker declarative props", () => {
  it("renders label, description, and error message props", () => {
    render(
      <DatePicker
        label="Event date"
        description="Pick a day"
        errorMessage="Required"
        isInvalid
        isDisabled
      />,
    );

    expect(screen.getByText("Event date")).toBeInTheDocument();
    expect(screen.getByText("Pick a day")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(
      document.querySelector("[data-date-picker-trigger]"),
    ).toHaveAttribute("data-disabled", "true");
  });

  it("uses custom popover content instead of the default calendar", () => {
    render(
      <DatePicker aria-label="Event date">
        <DatePickerTrigger />
        <DatePickerPopover>
          <div>Custom popover panel</div>
        </DatePickerPopover>
      </DatePicker>,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Custom popover panel")).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });
});
