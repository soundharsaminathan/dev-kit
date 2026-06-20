import "@testing-library/jest-dom/vitest";
import { getLocalTimeZone, today } from "@internationalized/date";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarHeader,
  CalendarHeading,
  RangeCalendar,
} from "../Calendar";

describe("Calendar", () => {
  it("renders a calendar grid", () => {
    render(<Calendar aria-label="Event date" />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("application")).toHaveAttribute(
      "data-calendar",
      "",
    );
  });

  it("renders previous and next month buttons", () => {
    render(<Calendar aria-label="Event date" />);
    expect(
      screen.getByRole("button", { name: "Previous" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("selects a date when a cell is clicked", () => {
    render(<Calendar aria-label="Event date" />);
    const cell = document.querySelector(
      "[data-calendar-cell]:not([data-disabled='true']):not([data-outside-month='true'])",
    );
    expect(cell).toBeTruthy();
    if (cell) {
      fireEvent.click(cell);
      expect(cell).toHaveAttribute("data-selected", "true");
    }
  });
});

describe("RangeCalendar", () => {
  it("renders a range calendar", () => {
    render(<RangeCalendar aria-label="Trip dates" />);
    expect(screen.getByRole("application")).toHaveAttribute(
      "data-range-calendar",
      "",
    );
  });
});

describe("Calendar subcomponents", () => {
  it("renders custom calendar structure", () => {
    render(
      <Calendar aria-label="Custom calendar">
        <CalendarHeader>
          <CalendarHeading />
        </CalendarHeader>
        <CalendarGrid>
          <tbody>
            <tr>
              <CalendarCell date={today(getLocalTimeZone())} />
            </tr>
          </tbody>
        </CalendarGrid>
      </Calendar>,
    );
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });
});
