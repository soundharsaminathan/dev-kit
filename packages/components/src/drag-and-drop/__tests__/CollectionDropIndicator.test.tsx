import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollectionDropIndicator } from "../CollectionDropIndicator";
import type { DragAndDropHooks } from "../useDragAndDrop";

function createHooks(
  options: {
    isHidden?: boolean;
    isDropTarget?: boolean;
    renderDropIndicator?: DragAndDropHooks["renderDropIndicator"];
  } = {},
): DragAndDropHooks {
  return {
    useDropIndicator: vi.fn(() => ({
      dropIndicatorProps: { "data-testid": "drop-indicator" },
      isHidden: options.isHidden ?? false,
      isDropTarget: options.isDropTarget ?? false,
    })),
    renderDropIndicator: options.renderDropIndicator,
  } as unknown as DragAndDropHooks;
}

describe("CollectionDropIndicator", () => {
  it("renders the default drop indicator", () => {
    render(
      <CollectionDropIndicator
        target={{ type: "item", key: "a", dropPosition: "before" }}
        dragAndDropHooks={createHooks({ isDropTarget: true })}
        dropState={{} as never}
      />,
    );

    expect(screen.getByRole("option")).toBeInTheDocument();
    expect(document.querySelector("[data-drop-indicator='']")).toHaveAttribute(
      "data-drop-target",
      "true",
    );
  });

  it("returns null when hidden", () => {
    const { container } = render(
      <CollectionDropIndicator
        target={{ type: "item", key: "a", dropPosition: "before" }}
        dragAndDropHooks={createHooks({ isHidden: true })}
        dropState={{} as never}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("uses a custom drop indicator renderer", () => {
    render(
      <CollectionDropIndicator
        target={{ type: "item", key: "a", dropPosition: "before" }}
        dragAndDropHooks={createHooks({
          renderDropIndicator: () => <span>Custom marker</span>,
        })}
        dropState={{} as never}
      />,
    );

    expect(screen.getByText("Custom marker")).toBeInTheDocument();
  });
});
