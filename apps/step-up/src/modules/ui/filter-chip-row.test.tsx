import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { FilterChipRow } from "./filter-chip-row";

const chips = [
  { id: "KIDS", label: "Kids" },
  { id: "ADULTS", label: "Adults" },
];

describe("FilterChipRow", () => {
  it("toggles a chip via onToggle", () => {
    const onToggle = vi.fn();
    renderWithProviders(
      <FilterChipRow chips={chips} selected={[]} onToggle={onToggle} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kids" }));
    expect(onToggle).toHaveBeenCalledWith("KIDS");
  });

  it("marks selected chips as pressed", () => {
    renderWithProviders(
      <FilterChipRow chips={chips} selected={["KIDS"]} onToggle={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Kids" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Adults" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
