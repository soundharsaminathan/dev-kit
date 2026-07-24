import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { BatchFiltersToolbar } from "./batch-filters-toolbar";

describe("BatchFiltersToolbar", () => {
  it("changes status when Active is clicked", () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <BatchFiltersToolbar
        status="ALL"
        category="ALL"
        style={null}
        search=""
        styleChips={[]}
        onStatusChange={onStatusChange}
        onCategoryChange={vi.fn()}
        onStyleChange={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(onStatusChange).toHaveBeenCalledWith("ACTIVE");
  });

  it("changes category when Kids is clicked", () => {
    const onCategoryChange = vi.fn();
    renderWithProviders(
      <BatchFiltersToolbar
        status="ALL"
        category="ALL"
        style={null}
        search=""
        styleChips={[]}
        onStatusChange={vi.fn()}
        onCategoryChange={onCategoryChange}
        onStyleChange={vi.fn()}
        onSearchChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kids" }));
    expect(onCategoryChange).toHaveBeenCalledWith("KIDS");
  });
});
