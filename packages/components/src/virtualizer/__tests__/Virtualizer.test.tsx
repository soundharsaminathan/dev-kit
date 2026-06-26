import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("uses a custom renderItem callback", () => {
    render(
      <Virtualizer
        aria-label="Large list"
        items={items.slice(0, 5)}
        height={120}
        rowHeight={40}
        selectionMode="none"
        renderItem={(item) => <span>Custom {item.label}</span>}
      />,
    );

    expect(screen.getByText("Custom Item 1")).toBeInTheDocument();
  });

  it("syncs layout on scroll and height changes", () => {
    const { rerender, container } = render(
      <Virtualizer
        aria-label="Large list"
        items={items}
        height={120}
        rowHeight={40}
        selectionMode="none"
      />,
    );

    const scroller = container.querySelector("[data-virtualizer='']");
    expect(scroller).toBeInTheDocument();

    fireEvent.scroll(scroller!);

    rerender(
      <Virtualizer
        aria-label="Large list"
        items={items}
        height={240}
        rowHeight={40}
        selectionMode="none"
      />,
    );

    expect(scroller).toHaveAttribute(
      "style",
      expect.stringContaining("height"),
    );
  });
});
