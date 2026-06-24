import "@testing-library/jest-dom/vitest";
import { render, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DropIndicator, useDragAndDrop } from "../index";

describe("DropIndicator", () => {
  it("renders with data-drop-indicator attribute", () => {
    const { container } = render(<DropIndicator />);
    expect(
      container.querySelector("[data-drop-indicator='']"),
    ).toBeInTheDocument();
  });

  it("marks active drop target", () => {
    const { container } = render(<DropIndicator isDropTarget />);
    expect(container.querySelector("[data-drop-indicator='']")).toHaveAttribute(
      "data-drop-target",
      "true",
    );
  });
});

describe("useDragAndDrop", () => {
  it("returns hooks when getItems is provided", () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        getItems: () => [{ "text/plain": "item" }],
      }),
    );

    expect(
      result.current.dragAndDropHooks.useDraggableCollectionState,
    ).toBeDefined();
    expect(result.current.dragAndDropHooks.useDraggableItem).toBeDefined();
  });

  it("returns drop hooks when onReorder is provided", () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        onReorder: () => {},
      }),
    );

    expect(
      result.current.dragAndDropHooks.useDroppableCollectionState,
    ).toBeDefined();
    expect(result.current.dragAndDropHooks.useDropIndicator).toBeDefined();
  });
});
