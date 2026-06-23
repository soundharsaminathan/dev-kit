import type { DroppableCollectionState } from "@react-stately/dnd";
import type { DropTarget } from "@react-types/shared";
import { useRef } from "react";
import type { DragAndDropHooks } from "./useDragAndDrop";
import { DropIndicator } from "./useDragAndDrop";

type CollectionDropIndicatorProps = {
  target: DropTarget;
  dragAndDropHooks: DragAndDropHooks;
  dropState: DroppableCollectionState;
};

export function CollectionDropIndicator({
  target,
  dragAndDropHooks,
  dropState,
}: CollectionDropIndicatorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { dropIndicatorProps, isHidden, isDropTarget } =
    dragAndDropHooks.useDropIndicator!({ target }, dropState, ref);

  if (isHidden) {
    return null;
  }

  const rendered = dragAndDropHooks.renderDropIndicator?.(target);

  return (
    // biome-ignore lint/a11y/useFocusableInteractive: drop indicator is a drag position marker, not a selectable option
    <div {...dropIndicatorProps} ref={ref} role="option">
      {rendered ?? <DropIndicator isDropTarget={isDropTarget} />}
    </div>
  );
}
