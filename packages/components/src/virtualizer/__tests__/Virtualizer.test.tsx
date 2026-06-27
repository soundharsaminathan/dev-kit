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

  it("falls back to offsetWidth when clientWidth is zero", () => {
    const { container } = render(
      <Virtualizer
        aria-label="Large list"
        items={items.slice(0, 5)}
        height={120}
        rowHeight={40}
        selectionMode="none"
      />,
    );

    const scroller = container.querySelector(
      "[data-virtualizer='']",
    ) as HTMLElement;
    Object.defineProperty(scroller, "clientWidth", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(scroller, "offsetWidth", {
      configurable: true,
      value: 240,
    });

    fireEvent.scroll(scroller);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("renders item labels when renderItem is omitted", () => {
    render(
      <Virtualizer
        aria-label="Large list"
        items={items.slice(0, 3)}
        height={120}
        rowHeight={40}
        selectionMode="none"
      />,
    );

    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("accepts custom layout options", () => {
    const { container } = render(
      <Virtualizer
        aria-label="Large list"
        items={items.slice(0, 5)}
        height={120}
        rowHeight={48}
        layoutOptions={{ padding: 4 }}
        selectionMode="none"
      />,
    );

    expect(
      container.querySelector("[data-virtualizer='']"),
    ).toBeInTheDocument();
  });

  it("skips disabled items in selection", () => {
    render(
      <Virtualizer
        aria-label="Large list"
        items={[
          { id: "1", label: "Item 1" },
          { id: "2", label: "Item 2", isDisabled: true },
        ]}
        height={120}
        rowHeight={40}
        selectionMode="single"
      />,
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });
});
