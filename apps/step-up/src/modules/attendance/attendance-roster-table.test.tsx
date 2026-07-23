/** @vitest-environment jsdom */

import { IconProvider } from "@dev-ui/icons";
import lucidePack from "@dev-ui/icons-packs/lucide";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AttendanceRosterTable } from "./attendance-roster-table";
import type { AttendanceRosterEntry } from "./types";

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  cleanup();
});

const roster: AttendanceRosterEntry[] = [
  {
    studentId: "s1",
    student: { name: "Ada Lovelace" },
    attendance: null,
  },
  {
    studentId: "s2",
    student: { name: "Grace Hopper" },
    attendance: {
      id: "a1",
      status: "PRESENT",
      source: "TRAINER",
    },
  },
];

function renderTable(
  props: Partial<React.ComponentProps<typeof AttendanceRosterTable>> = {},
) {
  const onMarkOne = vi.fn();
  const onMarkSelected = vi.fn();
  render(
    <IconProvider icons={{ library: "lucide" }} initialPack={lucidePack}>
      <AttendanceRosterTable
        roster={roster}
        onMarkOne={onMarkOne}
        onMarkSelected={onMarkSelected}
        {...props}
      />
    </IconProvider>,
  );
  return { onMarkOne, onMarkSelected };
}

describe("AttendanceRosterTable selection", () => {
  it("selects a student when the row checkbox is clicked", () => {
    renderTable();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Ada Lovelace" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("1 selected");
  });

  it("selects when the visible checkbox control is clicked", () => {
    renderTable();

    const checkbox = screen.getByRole("checkbox", {
      name: "Select Ada Lovelace",
    });
    const control = checkbox.closest("[data-checkbox-control]");
    expect(control).toBeTruthy();
    // Input is stretched over the control so the visible hit target is the input
    fireEvent.click(within(control as HTMLElement).getByRole("checkbox"));

    expect(screen.getByRole("status")).toHaveTextContent("1 selected");
  });

  it("selects all from the header checkbox", () => {
    renderTable();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select all students" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("2 selected");
  });

  it("marks selected students present", () => {
    const { onMarkSelected } = renderTable();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Ada Lovelace" }),
    );

    fireEvent.click(
      within(screen.getByRole("status")).getByRole("button", {
        name: "Mark present",
      }),
    );

    expect(onMarkSelected).toHaveBeenCalledWith(["s1"], "PRESENT");
  });
});
