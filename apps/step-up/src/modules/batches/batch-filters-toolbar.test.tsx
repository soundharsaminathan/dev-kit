import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { BatchFiltersToolbar } from "./batch-filters-toolbar";

const defaultProps = {
  status: "ALL",
  category: "ALL",
  trial: "ALL",
  style: null as string | null,
  search: "",
  styleChips: [] as Array<{ id: string; label: string }>,
  countMatches: () => 0,
  onStatusChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onTrialChange: vi.fn(),
  onStyleChange: vi.fn(),
  onSearchChange: vi.fn(),
};

describe("BatchFiltersToolbar", () => {
  it("changes status when Active is clicked", () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <BatchFiltersToolbar {...defaultProps} onStatusChange={onStatusChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(onStatusChange).toHaveBeenCalledWith("ACTIVE");
  });

  it("changes category when Kids is clicked", () => {
    const onCategoryChange = vi.fn();
    renderWithProviders(
      <BatchFiltersToolbar
        {...defaultProps}
        onCategoryChange={onCategoryChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kids" }));
    expect(onCategoryChange).toHaveBeenCalledWith("KIDS");
  });

  it("changes trial when Trial only is clicked", () => {
    const onTrialChange = vi.fn();
    renderWithProviders(
      <BatchFiltersToolbar {...defaultProps} onTrialChange={onTrialChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Trial only" }));
    expect(onTrialChange).toHaveBeenCalledWith("TRIAL");
  });

  it("opens advanced filters from the filter icon", () => {
    renderWithProviders(<BatchFiltersToolbar {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Open filters" }));
    expect(
      screen.getByRole("heading", { name: "Filters" }),
    ).toBeInTheDocument();
  });
});
