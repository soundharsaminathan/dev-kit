import type {
  DraggableCollectionProps,
  DragItem,
  DroppableCollectionProps,
  DropTarget,
  DropTargetDelegate,
  Key,
} from "@react-types/shared";
import type { JSX } from "react";

export type DragAndDropOptions<T = object> = Omit<
  DraggableCollectionProps,
  "preview" | "getItems"
> &
  DroppableCollectionProps & {
    getItems?: ((keys: Set<Key>, items: T[]) => DragItem[]) | undefined;
    renderDragPreview?:
      | ((
          items: DragItem[],
        ) => JSX.Element | { element: JSX.Element; x: number; y: number })
      | undefined;
    renderDropIndicator?: ((target: DropTarget) => JSX.Element) | undefined;
    dropTargetDelegate?: DropTargetDelegate | undefined;
    isDisabled?: boolean | undefined;
  };

export type DropIndicatorProps = {
  className?: string | undefined;
  isDropTarget?: boolean | undefined;
};

export type { DragItem, DropTarget } from "@react-types/shared";
