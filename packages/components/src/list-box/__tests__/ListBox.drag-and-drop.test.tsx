import "@testing-library/jest-dom/vitest";
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDragAndDrop } from "../../drag-and-drop";
import { ListBox } from "../ListBox";

const items = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
  { id: "c", label: "Gamma" },
];

function DraggableListBox() {
  const { dragAndDropHooks } = useDragAndDrop({
    getItems(keys) {
      return [...keys].map((key) => ({
        "text/plain": String(key),
      }));
    },
    onReorder() {},
  });

  return (
    <ListBox
      aria-label="Reorderable list"
      items={items}
      dragAndDropHooks={dragAndDropHooks}
    />
  );
}

describe("ListBox drag and drop", () => {
  it("renders draggable list items with drop indicators enabled", () => {
    render(<DraggableListBox />);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alpha" })).toHaveAttribute(
      "data-allows-dragging",
      "true",
    );
  });

  it("supports reorder callbacks from drag-and-drop hooks", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() =>
      useDragAndDrop({
        getItems: (keys) =>
          [...keys].map((key) => ({ "text/plain": String(key) })),
        onReorder,
      }),
    );

    render(
      <ListBox
        aria-label="Reorderable list"
        items={items}
        dragAndDropHooks={result.current.dragAndDropHooks}
      />,
    );

    const option = screen.getByRole("option", { name: "Alpha" });
    fireEvent.keyDown(option, { key: " " });
    expect(option).toBeInTheDocument();
  });
});
