import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Virtualizer } from "../index";

const items = Array.from({ length: 100 }, (_, index) => ({
  id: String(index + 1),
  label: `Item ${index + 1}`,
}));

describe("Virtualizer", () => {
  it("renders with data-virtualizer attribute", () => {
    const { container } = render(
      <Virtualizer
        aria-label="Large list"
        items={items}
        height={240}
        selectionMode="none"
      />,
    );

    expect(
      container.querySelector("[data-virtualizer='']"),
    ).toBeInTheDocument();
  });

  it("renders visible items only", () => {
    render(
      <Virtualizer
        aria-label="Large list"
        items={items}
        height={120}
        rowHeight={40}
        selectionMode="none"
      />,
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.queryByText("Item 100")).not.toBeInTheDocument();
  });
});
