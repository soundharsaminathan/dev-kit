import { cn } from "@dev-ui/core";
import type {
  DropIndicatorProps as AriaDropIndicatorProps,
  DraggableCollectionOptions,
  DraggableItemProps,
  DraggableItemResult,
  DroppableCollectionOptions,
  DroppableCollectionResult,
  DroppableItemOptions,
  DroppableItemResult,
} from "@react-aria/dnd";
import {
  DragPreview,
  isVirtualDragging,
  ListDropTargetDelegate,
  useDraggableCollection,
  useDraggableItem,
  useDropIndicator,
  useDroppableCollection,
  useDroppableItem,
} from "@react-aria/dnd";
import type {
  DraggableCollectionState,
  DraggableCollectionStateOptions,
  DroppableCollectionState,
  DroppableCollectionStateOptions,
} from "@react-stately/dnd";
import {
  useDraggableCollectionState,
  useDroppableCollectionState,
} from "@react-stately/dnd";
import type { RefObject } from "react";
import { createContext, useMemo } from "react";
import styles from "./drag-and-drop.module.scss";
import type {
  DragAndDropOptions,
  DropIndicatorProps,
} from "./drag-and-drop.types";

type DraggableCollectionStateOpts = Omit<
  DraggableCollectionStateOptions,
  "getItems"
>;

type DragHooks = {
  useDraggableCollectionState?: (
    props: DraggableCollectionStateOpts,
  ) => DraggableCollectionState;
  useDraggableCollection?: (
    props: DraggableCollectionOptions,
    state: DraggableCollectionState,
    ref: RefObject<HTMLElement | null>,
  ) => void;
  useDraggableItem?: (
    props: DraggableItemProps,
    state: DraggableCollectionState,
  ) => DraggableItemResult;
  DragPreview?: typeof DragPreview;
  renderDragPreview?: DragAndDropOptions["renderDragPreview"];
  isVirtualDragging?: () => boolean;
};

type DropHooks = {
  useDroppableCollectionState?: (
    props: DroppableCollectionStateOptions,
  ) => DroppableCollectionState;
  useDroppableCollection?: (
    props: DroppableCollectionOptions,
    state: DroppableCollectionState,
    ref: RefObject<HTMLElement | null>,
  ) => DroppableCollectionResult;
  useDroppableItem?: (
    options: DroppableItemOptions,
    state: DroppableCollectionState,
    ref: RefObject<HTMLElement | null>,
  ) => DroppableItemResult;
  useDropIndicator?: (
    props: AriaDropIndicatorProps,
    state: DroppableCollectionState,
    ref: RefObject<HTMLElement | null>,
  ) => ReturnType<typeof useDropIndicator>;
  renderDropIndicator?: DragAndDropOptions["renderDropIndicator"];
  dropTargetDelegate?: DragAndDropOptions["dropTargetDelegate"];
  ListDropTargetDelegate: typeof ListDropTargetDelegate;
};

export type DragAndDropHooks = DragHooks & DropHooks;

export type DragAndDrop = {
  dragAndDropHooks: DragAndDropHooks;
};

export const DragAndDropContext = createContext<{
  dragAndDropHooks?: DragAndDropHooks | undefined;
  dragState?: DraggableCollectionState | undefined;
  dropState?: DroppableCollectionState | undefined;
}>({});

function DropIndicator({
  className,
  isDropTarget,
  ...props
}: DropIndicatorProps) {
  return (
    <div
      {...props}
      data-drop-indicator=""
      data-drop-target={isDropTarget ? "true" : undefined}
      className={cn(styles.indicator, className)}
    />
  );
}

function useDragAndDrop<T extends object>(
  options: DragAndDropOptions<T>,
): DragAndDrop {
  const dragAndDropHooks = useMemo(() => {
    const {
      onDrop,
      onInsert,
      onItemDrop,
      onReorder,
      onMove,
      onRootDrop,
      getItems,
      renderDragPreview,
      renderDropIndicator,
      dropTargetDelegate,
      isDisabled,
      ...collectionOptions
    } = options;

    const droppableOptions = {
      ...collectionOptions,
      ...(isDisabled !== undefined ? { isDisabled } : {}),
      ...(dropTargetDelegate !== undefined ? { dropTargetDelegate } : {}),
    };

    const isDraggable = Boolean(getItems);
    const isDroppable = Boolean(
      onDrop || onInsert || onItemDrop || onReorder || onMove || onRootDrop,
    );

    const hooks = {} as DragAndDropHooks;

    if (isDraggable) {
      hooks.useDraggableCollectionState = (
        props: DraggableCollectionStateOpts,
      ) =>
        // biome-ignore lint/correctness/useHookAtTopLevel: called by collection during render
        useDraggableCollectionState({
          ...props,
          ...options,
        } as DraggableCollectionStateOptions);
      hooks.useDraggableCollection = useDraggableCollection;
      hooks.useDraggableItem = useDraggableItem;
      hooks.DragPreview = DragPreview;
      hooks.renderDragPreview = renderDragPreview;
      hooks.isVirtualDragging = isVirtualDragging;
    }

    if (isDroppable) {
      hooks.useDroppableCollectionState = (
        props: DroppableCollectionStateOptions,
      ) =>
        // biome-ignore lint/correctness/useHookAtTopLevel: called by collection during render
        useDroppableCollectionState({ ...props, ...droppableOptions });
      hooks.useDroppableItem = useDroppableItem;
      hooks.useDroppableCollection = (
        props: DroppableCollectionOptions,
        state: DroppableCollectionState,
        ref: RefObject<HTMLElement | null>,
      ) =>
        // biome-ignore lint/correctness/useHookAtTopLevel: called by collection during render
        useDroppableCollection({ ...props, ...droppableOptions }, state, ref);
      hooks.useDropIndicator = useDropIndicator;
      hooks.renderDropIndicator = renderDropIndicator;
      hooks.dropTargetDelegate = dropTargetDelegate;
      hooks.ListDropTargetDelegate = ListDropTargetDelegate;
    }

    return hooks;
  }, [options]);

  return { dragAndDropHooks };
}

export type {
  DragAndDropOptions,
  DropIndicatorProps,
} from "./drag-and-drop.types";
export { DropIndicator, useDragAndDrop };
