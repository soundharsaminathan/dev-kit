import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { StudentFiltersToolbar } from "./student-filters-toolbar";

const defaultProps = {
  stage: "ALL",
  period: "lifetime" as const,
  ageRange: "ALL",
  gender: "ALL",
  search: "",
  countMatches: () => 0,
  onStageChange: vi.fn(),
  onPeriodChange: vi.fn(),
  onAgeRangeChange: vi.fn(),
  onGenderChange: vi.fn(),
  onSearchChange: vi.fn(),
};

describe("StudentFiltersToolbar", () => {
  it("changes stage when Active is clicked", () => {
    const onStageChange = vi.fn();
    renderWithProviders(
      <StudentFiltersToolbar {...defaultProps} onStageChange={onStageChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(onStageChange).toHaveBeenCalledWith("active");
  });

  it("changes period when This month is clicked", () => {
    const onPeriodChange = vi.fn();
    renderWithProviders(
      <StudentFiltersToolbar
        {...defaultProps}
        onPeriodChange={onPeriodChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "This month" }));
    expect(onPeriodChange).toHaveBeenCalledWith("this_month");
  });

  it("changes age range when Under 10 is clicked", () => {
    const onAgeRangeChange = vi.fn();
    renderWithProviders(
      <StudentFiltersToolbar
        {...defaultProps}
        onAgeRangeChange={onAgeRangeChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Under 10" }));
    expect(onAgeRangeChange).toHaveBeenCalledWith("UNDER_10");
  });

  it("changes gender when Female is clicked", () => {
    const onGenderChange = vi.fn();
    renderWithProviders(
      <StudentFiltersToolbar
        {...defaultProps}
        onGenderChange={onGenderChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Female" }));
    expect(onGenderChange).toHaveBeenCalledWith("FEMALE");
  });

  it("opens advanced filters from the filter icon", () => {
    renderWithProviders(<StudentFiltersToolbar {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Open filters" }));
    expect(
      screen.getByRole("heading", { name: "Filters" }),
    ).toBeInTheDocument();
  });

  it("applies search directly from the toolbar field", () => {
    const onSearchChange = vi.fn();
    renderWithProviders(
      <StudentFiltersToolbar
        {...defaultProps}
        onSearchChange={onSearchChange}
      />,
    );

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search students" }),
      {
        target: { value: "asha" },
      },
    );
    expect(onSearchChange).toHaveBeenCalledWith("asha");
  });
});
