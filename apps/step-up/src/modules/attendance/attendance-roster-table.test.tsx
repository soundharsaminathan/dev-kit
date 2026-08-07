import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { AttendanceRosterTable } from "./attendance-roster-table";
import type { AttendanceRosterEntry } from "./types";

const useIsMobileMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("@dev-ui/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dev-ui/hooks")>();
  return {
    ...actual,
    useIsMobile: () => useIsMobileMock(),
  };
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

const unpaidRoster: AttendanceRosterEntry[] = [
  {
    studentId: "s1",
    monthlyUnpaid: true,
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
  const onMarkAllUnmarkedPresent = vi.fn();
  renderWithProviders(
    <AttendanceRosterTable
      roster={roster}
      onMarkOne={onMarkOne}
      onMarkSelected={onMarkSelected}
      onMarkAllUnmarkedPresent={onMarkAllUnmarkedPresent}
      unmarkedCount={1}
      {...props}
    />,
  );
  return { onMarkOne, onMarkSelected, onMarkAllUnmarkedPresent };
}

describe("AttendanceRosterTable selection", () => {
  beforeEach(() => {
    useIsMobileMock.mockReturnValue(false);
  });

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

  it("marks selected students absent", () => {
    const { onMarkSelected } = renderTable();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Ada Lovelace" }),
    );

    fireEvent.click(
      within(screen.getByRole("status")).getByRole("button", {
        name: "Mark absent",
      }),
    );

    expect(onMarkSelected).toHaveBeenCalledWith(["s1"], "ABSENT");
  });

  it("calls mark-all unmarked present", () => {
    const { onMarkAllUnmarkedPresent } = renderTable();

    fireEvent.click(
      screen.getByRole("button", { name: "Mark all unmarked present" }),
    );

    expect(onMarkAllUnmarkedPresent).toHaveBeenCalledTimes(1);
  });

  it("disables bulk actions while busy", () => {
    renderTable({ isBusy: true });

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Ada Lovelace" }),
    );

    expect(
      within(screen.getByRole("status")).getByRole("button", {
        name: "Mark present",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Mark all unmarked present" }),
    ).toBeDisabled();
  });

  it("disables marking actions when markingDisabled", () => {
    const { onMarkOne, onMarkAllUnmarkedPresent } = renderTable({
      markingDisabled: true,
    });

    expect(screen.getByTestId("mark-present-s1")).toBeDisabled();
    expect(screen.getByTestId("mark-absent-s1")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Mark all unmarked present" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByTestId("mark-present-s1"));
    fireEvent.click(
      screen.getByRole("button", { name: "Mark all unmarked present" }),
    );

    expect(onMarkOne).not.toHaveBeenCalled();
    expect(onMarkAllUnmarkedPresent).not.toHaveBeenCalled();
  });

  it("renders empty roster without selection chrome", () => {
    renderTable({ roster: [], unmarkedCount: 0 });
    expect(
      screen.getByText("No students match this status filter."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/selected/i)).toBeNull();
  });

  it("hides bulk mark controls on mobile and orders Mark before Status", () => {
    useIsMobileMock.mockReturnValue(true);
    renderTable();

    expect(
      screen.queryByRole("checkbox", { name: "Select Ada Lovelace" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Mark all unmarked present" }),
    ).toBeNull();

    const headers = screen.getAllByRole("columnheader").map((header) =>
      header.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(headers).toEqual(["Student", "Mark", "Status"]);
  });

  it("confirms before marking an unpaid student present", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onMarkOne } = renderTable({ roster: unpaidRoster });

    fireEvent.click(screen.getByTestId("mark-present-s1"));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Ada Lovelace.*unpaid/i),
    );
    expect(onMarkOne).toHaveBeenCalledWith("s1", "PRESENT");
    confirmSpy.mockRestore();
  });

  it("cancels unpaid mark when confirm is dismissed", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onMarkOne } = renderTable({ roster: unpaidRoster });

    fireEvent.click(screen.getByTestId("mark-present-s1"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onMarkOne).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("marks paid students without a confirm dialog", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onMarkOne } = renderTable();

    fireEvent.click(screen.getByTestId("mark-present-s1"));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onMarkOne).toHaveBeenCalledWith("s1", "PRESENT");
    confirmSpy.mockRestore();
  });
});

describe("AttendanceRosterTable status filters", () => {
  beforeEach(() => {
    useIsMobileMock.mockReturnValue(false);
  });

  it("filters roster by Present / Unmarked / Absent chips", () => {
    const absentRoster: AttendanceRosterEntry[] = [
      ...roster,
      {
        studentId: "s3",
        student: { name: "Kathleen McNulty" },
        attendance: {
          id: "a2",
          status: "ABSENT",
          source: "DESK",
        },
      },
    ];
    renderTable({ roster: absentRoster, unmarkedCount: 1 });

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Kathleen McNulty")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Present", pressed: false }),
    );
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Kathleen McNulty")).toBeNull();
    expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText(/filter: Present/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Unmarked", pressed: false }),
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).toBeNull();
    expect(screen.queryByText("Kathleen McNulty")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Absent", pressed: false }),
    );
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.queryByText("Grace Hopper")).toBeNull();
    expect(screen.getByText("Kathleen McNulty")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "All", pressed: false }),
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Kathleen McNulty")).toBeInTheDocument();
  });
});
