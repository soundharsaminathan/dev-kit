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

  it("marks unmarked student present or absent in one click", () => {
    const { onMarkOne } = renderTable();

    fireEvent.click(screen.getByTestId("mark-present-s1"));
    expect(onMarkOne).toHaveBeenCalledWith("s1", "PRESENT");

    fireEvent.click(screen.getByTestId("mark-absent-s1"));
    expect(onMarkOne).toHaveBeenCalledWith("s1", "ABSENT");
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
    renderTable({ roster: [] });
    expect(
      screen.getByText("No students match this status filter."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/selected/i)).toBeNull();
  });

  it("hides status and selection on mobile", () => {
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
    expect(headers).toEqual(["Student", "Mark"]);
    expect(screen.getByTestId("mark-attendance-s1")).toBeInTheDocument();
  });

  it("confirms unpaid mark in a modal before marking present", async () => {
    const { onMarkOne } = renderTable({ roster: unpaidRoster });

    fireEvent.click(screen.getByTestId("mark-present-s1"));

    expect(onMarkOne).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("heading", { name: "Unpaid plan" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace.*unpaid/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-unpaid-mark"));

    expect(onMarkOne).toHaveBeenCalledWith("s1", "PRESENT");
  });

  it("cancels unpaid mark when modal is dismissed", async () => {
    const { onMarkOne } = renderTable({ roster: unpaidRoster });

    fireEvent.click(screen.getByTestId("mark-present-s1"));
    expect(
      await screen.findByRole("heading", { name: "Unpaid plan" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onMarkOne).not.toHaveBeenCalled();
  });

  it("marks paid students without a confirm dialog", () => {
    const { onMarkOne } = renderTable();

    fireEvent.click(screen.getByTestId("mark-present-s1"));

    expect(screen.queryByRole("heading", { name: "Unpaid plan" })).toBeNull();
    expect(onMarkOne).toHaveBeenCalledWith("s1", "PRESENT");
  });

  it("confirms before bulk-marking selected unpaid students", async () => {
    const { onMarkSelected } = renderTable({ roster: unpaidRoster });

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Ada Lovelace" }),
    );
    fireEvent.click(
      within(screen.getByRole("status")).getByRole("button", {
        name: "Mark present",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Unpaid plans" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 selected student.*unpaid/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-unpaid-mark"));

    expect(onMarkSelected).toHaveBeenCalledWith(["s1"], "PRESENT");
  });

  it("confirms before mark-all when unmarked unpaid students exist", async () => {
    const { onMarkAllUnmarkedPresent } = renderTable({
      roster: unpaidRoster,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Mark all unmarked present" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Unpaid plans" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 unmarked student.*unpaid/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-unpaid-mark"));

    expect(onMarkAllUnmarkedPresent).toHaveBeenCalledTimes(1);
  });

  it("cancels mark-all when unpaid bulk confirm is dismissed", async () => {
    const { onMarkAllUnmarkedPresent } = renderTable({
      roster: unpaidRoster,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Mark all unmarked present" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Unpaid plans" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onMarkAllUnmarkedPresent).not.toHaveBeenCalled();
  });

  it("shows Not paid badge for unpaid roster rows", () => {
    renderTable({ roster: unpaidRoster });
    expect(screen.getByText("Not paid")).toBeInTheDocument();
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
    renderTable({ roster: absentRoster });

    expect(screen.getByRole("button", { name: "All (3)" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unmarked (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Present (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Absent (1)" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Kathleen McNulty")).toBeInTheDocument();

    const filterChip = (name: string | RegExp, pressed = false) =>
      screen
        .getAllByRole("button", { name, pressed })
        .find((button) => !button.hasAttribute("data-testid"));

    fireEvent.click(filterChip(/^Present/)!);
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Kathleen McNulty")).toBeNull();
    expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText(/filter: Present/)).toBeInTheDocument();

    fireEvent.click(filterChip(/^Unmarked/)!);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).toBeNull();
    expect(screen.queryByText("Kathleen McNulty")).toBeNull();

    fireEvent.click(filterChip(/^Absent/)!);
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.queryByText("Grace Hopper")).toBeNull();
    expect(screen.getByText("Kathleen McNulty")).toBeInTheDocument();

    fireEvent.click(filterChip(/^All/)!);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Kathleen McNulty")).toBeInTheDocument();
  });

  it("filters roster rows by name, email, or phone", () => {
    const searchableRoster: AttendanceRosterEntry[] = [
      {
        studentId: "s1",
        student: {
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: "+91 98765 43210",
        },
        attendance: null,
      },
      {
        studentId: "s2",
        student: {
          name: "Grace Hopper",
          email: "grace@example.com",
          phone: "+91 90000 11111",
        },
        attendance: {
          id: "a1",
          status: "PRESENT",
          source: "TRAINER",
        },
      },
    ];

    renderTable({ roster: searchableRoster });

    const search = screen.getByRole("searchbox", { name: "Search roster" });
    fireEvent.change(search, { target: { value: "9876543210" } });

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "grace@example.com" } });
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });
});
