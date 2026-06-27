import "@testing-library/jest-dom/vitest";
import { getLocalTimeZone, today } from "@internationalized/date";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
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

  it("marks outside-month and disabled cells", () => {
    render(
      <Calendar aria-label="Event date" minValue={today(getLocalTimeZone())} />,
    );

    expect(
      document.querySelector("[data-outside-month='true']"),
    ).toBeInTheDocument();
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

  it("selects a date range", () => {
    render(<RangeCalendar aria-label="Trip dates" />);
    const cells = document.querySelectorAll(
      "[data-calendar-cell]:not([data-disabled='true']):not([data-outside-month='true'])",
    );
    fireEvent.click(cells[0]!);
    fireEvent.click(cells[3]!);
    expect(cells[0]).toHaveAttribute("data-selection-start", "true");
    expect(cells[3]).toHaveAttribute("data-selection-end", "true");
  });
});

describe("Calendar navigation", () => {
  it("changes months when next is clicked", () => {
    render(<Calendar aria-label="Event date" />);
    const heading = screen.getByRole("heading");
    const initial = heading.textContent;
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(heading.textContent).not.toBe(initial);
  });
});

describe("Calendar subcomponents", () => {
  it("throws when calendar subcomponents render outside Calendar", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <CalendarGrid>
          <tbody>
            <tr>
              <CalendarCell date={today(getLocalTimeZone())} />
            </tr>
          </tbody>
        </CalendarGrid>,
      ),
    ).toThrow(/must be used within Calendar or RangeCalendar/i);

    consoleError.mockRestore();
  });

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

  it("supports function children in CalendarGridBody", () => {
    render(
      <Calendar aria-label="Custom calendar">
        <CalendarGrid>
          <CalendarGridBody>
            {(date) => <CalendarCell date={date}>{date.day}</CalendarCell>}
          </CalendarGridBody>
        </CalendarGrid>
      </Calendar>,
    );

    fireEvent.click(
      document.querySelector(
        "[data-calendar-cell]:not([data-disabled='true'])",
      )!,
    );
    expect(
      document.querySelector("[data-selected='true']"),
    ).toBeInTheDocument();
  });
});
