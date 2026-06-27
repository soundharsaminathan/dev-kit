import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-stately/virtualizer", async () => {
  const actual = await vi.importActual<
    typeof import("@react-stately/virtualizer")
  >("@react-stately/virtualizer");

  return {
    ...actual,
    useVirtualizerState: (
      options: Parameters<typeof actual.useVirtualizerState>[0],
    ) => {
      const result = actual.useVirtualizerState(options);
      queueMicrotask(() => {
        options.onVisibleRectChange?.(new actual.Rect(12, 24, 200, 120));
      });
      return {
        ...result,
        visibleViews: [
          ...result.visibleViews,
          { content: { type: "header" }, layoutInfo: null },
          {
            content: {
              type: "item",
              key: "orphan",
              value: { id: "orphan", label: "Orphan" },
            },
            layoutInfo: null,
          },
        ],
      };
    },
  };
});

const { Virtualizer } = await import("../Virtualizer");

const items = Array.from({ length: 20 }, (_, index) => ({
  id: String(index + 1),
  label: `Item ${index + 1}`,
}));

describe("Virtualizer scroll sync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("syncs scroll offsets from visible rect changes", async () => {
    const { container } = render(
      <Virtualizer
        aria-label="Large list"
        items={items}
        height={120}
        rowHeight={40}
        selectionMode="none"
      />,
    );

    const scroller = container.querySelector(
      "[data-virtualizer='']",
    ) as HTMLElement;

    await vi.waitFor(() => {
      expect(scroller.scrollLeft).toBe(12);
      expect(scroller.scrollTop).toBe(24);
    });
  });
});
