import { cn, composeRefs } from "@dev-ui/core";
import type { DragPreviewRenderer } from "@react-aria/dnd";
import { useFocusRing } from "@react-aria/focus";
import { useLocale } from "@react-aria/i18n";
import { useHover } from "@react-aria/interactions";
import type { AriaListBoxOptions } from "@react-aria/listbox";
import { useListBox, useOption } from "@react-aria/listbox";
import { ListKeyboardDelegate } from "@react-aria/selection";
import { mergeProps } from "@react-aria/utils";
import type {
  DraggableCollectionState,
  DroppableCollectionState,
} from "@react-stately/dnd";
import type { ListProps, ListState } from "@react-stately/list";
import { useListState } from "@react-stately/list";
import type { Node } from "@react-types/shared";
import {
  createContext,
  type ReactNode,
  type Ref,
  type RefObject,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useOptionalAutocompleteContext } from "../autocomplete/autocomplete-context";
import {
  CollectionDropIndicator,
  DragAndDropContext,
  type DragAndDropHooks,
} from "../drag-and-drop";
import {
  type CollectionItem,
  getCollectionChild,
  getDisabledKeys,
  parseCollectionItems,
} from "./collection-utils";
import { useFilteredListState } from "./filter-list-collection";
import styles from "./list-box.module.scss";
import type {
  ListBoxContextValue,
  ListBoxItemContextValue,
  ListBoxItemDescriptionProps,
  ListBoxItemLabelProps,
  ListBoxItemProps,
  ListBoxProps,
  ListBoxSectionHeaderProps,
  ListBoxSectionProps,
} from "./list-box.types";

const ListBoxContext = createContext<ListBoxContextValue | null>(null);
const ListBoxItemContext = createContext<ListBoxItemContextValue | null>(null);

function useListBoxContext(component: string): ListBoxContextValue {
  const context = useContext(ListBoxContext);
  if (!context) {
    throw new Error(`${component} must be used within ListBox`);
  }
  return context;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={styles.checkIcon}
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ListBoxCollectionProps<T extends object> = {
  state: ListState<T>;
  listBoxProps: React.HTMLAttributes<HTMLUListElement>;
  selectionMode: "single" | "multiple" | "none";
  className?: string | undefined;
  standalone?: boolean | undefined;
  dragAndDropHooks?: DragAndDropHooks | undefined;
  dragState?: DraggableCollectionState | undefined;
  dropState?: DroppableCollectionState | undefined;
  droppableCollectionProps?: React.HTMLAttributes<HTMLElement> | undefined;
  isRootDropTarget?: boolean | undefined;
  dragPreview?: ReactNode;
  ref?: Ref<HTMLUListElement>;
};

function ListBoxCollection<T extends object>({
  state,
  listBoxProps,
  selectionMode,
  className,
  standalone,
  dragAndDropHooks,
  dragState,
  dropState,
  droppableCollectionProps,
  isRootDropTarget,
  dragPreview,
  ref,
}: Omit<ListBoxCollectionProps<T>, "children">) {
  const contextValue = useMemo(
    () => ({
      state: state as ListState<CollectionItem>,
      selectionMode,
    }),
    [state, selectionMode],
  );

  const dragAndDropContextValue = useMemo(
    () => ({
      dragAndDropHooks,
      dragState,
      dropState,
    }),
    [dragAndDropHooks, dragState, dropState],
  );

  const showDropIndicators = Boolean(
    dragAndDropHooks && dragState && dropState,
  );

  return (
    <DragAndDropContext.Provider value={dragAndDropContextValue}>
      <ListBoxContext.Provider value={contextValue}>
        <ul
          {...mergeProps(listBoxProps, droppableCollectionProps)}
          ref={ref}
          data-listbox=""
          data-standalone={standalone ? "true" : undefined}
          data-drop-target={isRootDropTarget ? "true" : undefined}
          className={cn(styles.root, className)}
        >
          {renderCollectionItems(
            state,
            showDropIndicators ? dragAndDropHooks : undefined,
            showDropIndicators ? dragState : undefined,
            showDropIndicators ? dropState : undefined,
          )}
        </ul>
        {dragPreview}
      </ListBoxContext.Provider>
    </DragAndDropContext.Provider>
  );
}

function renderCollectionItems<T extends object>(
  state: ListState<T>,
  dragAndDropHooks?: DragAndDropHooks,
  dragState?: DraggableCollectionState,
  dropState?: DroppableCollectionState,
) {
  const items = [...state.collection].filter((node) => node.type === "item");
  const hasDragAndDrop = Boolean(dragAndDropHooks && dragState && dropState);

  return items.flatMap((item, index) => {
    const elements: ReactNode[] = [];

    if (hasDragAndDrop) {
      elements.push(
        <CollectionDropIndicator
          key={`before-${String(item.key)}`}
          target={{ type: "item", key: item.key, dropPosition: "before" }}
          dragAndDropHooks={dragAndDropHooks!}
          dropState={dropState!}
        />,
      );
    }

    elements.push(
      hasDragAndDrop ? (
        <ListBoxDraggableItemRenderer
          key={item.key}
          item={item}
          dragAndDropHooks={dragAndDropHooks!}
          dragState={dragState!}
          dropState={dropState!}
        >
          {(item.value as CollectionItem).label}
        </ListBoxDraggableItemRenderer>
      ) : (
        <ListBoxItemRenderer key={item.key} item={item}>
          {(item.value as CollectionItem).label}
        </ListBoxItemRenderer>
      ),
    );

    if (hasDragAndDrop && index === items.length - 1) {
      elements.push(
        <CollectionDropIndicator
          key={`after-${String(item.key)}`}
          target={{ type: "item", key: item.key, dropPosition: "after" }}
          dragAndDropHooks={dragAndDropHooks!}
          dropState={dropState!}
        />,
      );
    }

    return elements;
  });
}

function ListBoxItemContent({
  children,
  selectionMode,
  isSelected,
}: {
  children: ReactNode;
  selectionMode: "single" | "multiple" | "none";
  isSelected: boolean;
}) {
  return (
    <>
      {typeof children === "string" ? (
        <ListBoxItemLabel>{children}</ListBoxItemLabel>
      ) : (
        children
      )}
      {selectionMode !== "none" && isSelected ? (
        <span data-listbox-item-indicator="" className={styles.indicator}>
          <CheckIcon />
        </span>
      ) : null}
    </>
  );
}

function ListBoxItemRenderer<T extends object>({
  item,
  children,
  className,
}: {
  item: Node<T>;
  children: ReactNode;
  className?: string | undefined;
}) {
  const { state, selectionMode = "single" } = useListBoxContext("ListBoxItem");
  const ref = useRef<HTMLLIElement>(null);
  const { optionProps, isSelected, isFocused, isDisabled } = useOption(
    { key: item.key },
    state,
    ref,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const itemContext: ListBoxItemContextValue = {
    item: item as Node<CollectionItem>,
    isSelected,
    isDisabled,
    isFocused,
    isFocusVisible,
    isHovered,
    selectionMode,
  };

  return (
    <ListBoxItemContext.Provider value={itemContext}>
      <li
        {...mergeProps(optionProps, hoverProps, focusProps)}
        ref={ref}
        data-listbox-item=""
        data-selected={isSelected ? "true" : undefined}
        data-disabled={isDisabled ? "true" : undefined}
        data-hovered={isHovered ? "true" : undefined}
        data-focused={isFocused ? "true" : undefined}
        data-focus-visible={isFocusVisible ? "true" : undefined}
        data-selection-mode={selectionMode}
        className={cn(styles.item, className)}
      >
        <ListBoxItemContent
          selectionMode={selectionMode}
          isSelected={isSelected}
        >
          {children}
        </ListBoxItemContent>
      </li>
    </ListBoxItemContext.Provider>
  );
}

function ListBoxDraggableItemRenderer<T extends object>({
  item,
  children,
  className,
  dragAndDropHooks,
  dragState,
  dropState,
}: {
  item: Node<T>;
  children: ReactNode;
  className?: string | undefined;
  dragAndDropHooks: DragAndDropHooks;
  dragState: DraggableCollectionState;
  dropState: DroppableCollectionState;
}) {
  const { state, selectionMode = "single" } = useListBoxContext("ListBoxItem");
  const ref = useRef<HTMLLIElement>(null);
  const { optionProps, isSelected, isFocused, isDisabled } = useOption(
    { key: item.key },
    state,
    ref,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocusVisible } = useFocusRing();
  const { dragProps } = dragAndDropHooks.useDraggableItem!(
    { key: item.key, hasAction: false },
    dragState,
  );
  const droppableItem = dragAndDropHooks.useDroppableItem!(
    {
      target: { type: "item", key: item.key, dropPosition: "on" },
    },
    dropState,
    ref,
  );

  const isDraggable = !(
    dragState.isDisabled || dragState.selectionManager.isDisabled(item.key)
  );
  const isDragging = dragState.isDragging(item.key);

  const itemContext: ListBoxItemContextValue = {
    item: item as Node<CollectionItem>,
    isSelected,
    isDisabled,
    isFocused,
    isFocusVisible,
    isHovered,
    selectionMode,
  };

  return (
    <ListBoxItemContext.Provider value={itemContext}>
      <li
        {...mergeProps(
          optionProps,
          hoverProps,
          focusProps,
          dragProps,
          droppableItem.dropProps,
        )}
        ref={ref}
        data-listbox-item=""
        data-selected={isSelected ? "true" : undefined}
        data-disabled={isDisabled ? "true" : undefined}
        data-hovered={isHovered ? "true" : undefined}
        data-focused={isFocused ? "true" : undefined}
        data-focus-visible={isFocusVisible ? "true" : undefined}
        data-selection-mode={selectionMode}
        data-dragging={isDragging ? "true" : undefined}
        data-drop-target={droppableItem.isDropTarget ? "true" : undefined}
        data-allows-dragging={isDraggable ? "true" : undefined}
        className={cn(styles.item, className)}
      >
        <ListBoxItemContent
          selectionMode={selectionMode}
          isSelected={isSelected}
        >
          {children}
        </ListBoxItemContent>
      </li>
    </ListBoxItemContext.Provider>
  );
}

function useListBoxDragAndDrop<T extends object>({
  dragAndDropHooks,
  state,
  listRef,
}: {
  dragAndDropHooks?: DragAndDropHooks | undefined;
  state: ListState<T>;
  listRef: RefObject<HTMLUListElement | null>;
}) {
  const { direction } = useLocale();
  const preview = useRef<DragPreviewRenderer | null>(null);
  const { collection, selectionManager } = state;
  const isListDraggable = Boolean(
    dragAndDropHooks?.useDraggableCollectionState,
  );
  const isListDroppable = Boolean(
    dragAndDropHooks?.useDroppableCollectionState,
  );
  const useDraggableCollectionState =
    dragAndDropHooks?.useDraggableCollectionState;
  const useDraggableCollection = dragAndDropHooks?.useDraggableCollection;
  const useDroppableCollectionState =
    dragAndDropHooks?.useDroppableCollectionState;
  const useDroppableCollection = dragAndDropHooks?.useDroppableCollection;

  const keyboardDelegate = useMemo(
    () =>
      new ListKeyboardDelegate({
        collection,
        disabledKeys: selectionManager.disabledKeys,
        disabledBehavior: selectionManager.disabledBehavior,
        ref: listRef,
        layout: "stack",
        orientation: "vertical",
        direction,
      }),
    [collection, selectionManager, listRef, direction],
  );

  let dragState: DraggableCollectionState | undefined;
  let dropState: DroppableCollectionState | undefined;
  let droppableCollectionProps: React.HTMLAttributes<HTMLElement> | undefined;
  let isRootDropTarget = false;
  let dragPreview: ReactNode = null;

  if (
    isListDraggable &&
    dragAndDropHooks &&
    useDraggableCollectionState &&
    useDraggableCollection
  ) {
    // biome-ignore lint/correctness/useHookAtTopLevel: drag hooks are stable for this list instance
    dragState = useDraggableCollectionState({
      collection,
      selectionManager,
      ...(dragAndDropHooks.renderDragPreview ? { preview } : {}),
    });
    // biome-ignore lint/correctness/useHookAtTopLevel: drag hooks are stable for this list instance
    useDraggableCollection({}, dragState, listRef);

    if (dragAndDropHooks.renderDragPreview && dragAndDropHooks.DragPreview) {
      const DragPreview = dragAndDropHooks.DragPreview;
      dragPreview = (
        <DragPreview ref={preview}>
          {dragAndDropHooks.renderDragPreview}
        </DragPreview>
      );
    }
  }

  if (
    isListDroppable &&
    dragAndDropHooks &&
    useDroppableCollectionState &&
    useDroppableCollection
  ) {
    // biome-ignore lint/correctness/useHookAtTopLevel: drop hooks are stable for this list instance
    dropState = useDroppableCollectionState({
      collection,
      selectionManager,
    });

    const dropTargetDelegate =
      dragAndDropHooks.dropTargetDelegate ??
      new dragAndDropHooks.ListDropTargetDelegate(collection, listRef, {
        orientation: "vertical",
        layout: "stack",
        direction,
      });

    // biome-ignore lint/correctness/useHookAtTopLevel: drop hooks are stable for this list instance
    const droppableCollection = useDroppableCollection(
      {
        keyboardDelegate,
        dropTargetDelegate,
      },
      dropState,
      listRef,
    );
    droppableCollectionProps = droppableCollection.collectionProps;
    isRootDropTarget = dropState.isDropTarget({ type: "root" });
  }

  return {
    isListDraggable,
    dragState,
    dropState,
    droppableCollectionProps,
    isRootDropTarget,
    dragPreview,
  };
}

function ListBox<T extends CollectionItem>({
  ref,
  items: itemsProp,
  children,
  className,
  selectionMode = "single",
  dragAndDropHooks,
  ...props
}: ListBoxProps<T>) {
  const autocomplete = useOptionalAutocompleteContext();
  const listRef = useRef<HTMLUListElement>(null);
  const resolvedListRef = autocomplete?.collectionRef ?? listRef;
  const itemsList = useMemo((): CollectionItem[] => {
    if (itemsProp) {
      return [...itemsProp];
    }
    return parseCollectionItems(children);
  }, [itemsProp, children]);

  const listStateProps = {
    ...props,
    items: itemsList as Iterable<T>,
    selectionMode,
    children: getCollectionChild,
    disabledKeys: getDisabledKeys(itemsList),
  };

  const baseState = useListState(listStateProps as ListProps<T>);
  const state = useFilteredListState(baseState, autocomplete?.nodeFilter);

  const {
    isListDraggable,
    dragState,
    dropState,
    droppableCollectionProps,
    isRootDropTarget,
    dragPreview,
  } = useListBoxDragAndDrop({
    dragAndDropHooks,
    state,
    listRef: resolvedListRef,
  });

  const listBoxAriaOptions = {
    ...props,
    selectionMode,
    ...(isListDraggable || props.shouldSelectOnPressUp
      ? {
          shouldSelectOnPressUp: Boolean(
            isListDraggable || props.shouldSelectOnPressUp,
          ),
        }
      : {}),
  };

  const { listBoxProps } = useListBox(
    autocomplete
      ? { ...listBoxAriaOptions, ...autocomplete.collectionProps }
      : listBoxAriaOptions,
    state,
    resolvedListRef,
  );

  return (
    <ListBoxCollection
      state={state}
      listBoxProps={listBoxProps}
      selectionMode={selectionMode}
      className={className}
      standalone
      dragAndDropHooks={dragAndDropHooks}
      dragState={dragState}
      dropState={dropState}
      droppableCollectionProps={droppableCollectionProps}
      isRootDropTarget={isRootDropTarget}
      dragPreview={dragPreview}
      ref={composeRefs(resolvedListRef, ref)}
    />
  );
}

export function ListBoxWithState<T extends object>({
  state,
  listBoxOptions,
  className,
  dragAndDropHooks,
  ref,
}: {
  state: ListState<T>;
  listBoxOptions: AriaListBoxOptions<T>;
  className?: string | undefined;
  dragAndDropHooks?: DragAndDropHooks | undefined;
  ref?: Ref<HTMLUListElement>;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const selectionMode = listBoxOptions.selectionMode ?? "single";

  const {
    isListDraggable,
    dragState,
    dropState,
    droppableCollectionProps,
    isRootDropTarget,
    dragPreview,
  } = useListBoxDragAndDrop({
    dragAndDropHooks,
    state,
    listRef,
  });

  const listBoxAriaOptions = {
    ...listBoxOptions,
    ...(isListDraggable || listBoxOptions.shouldSelectOnPressUp
      ? {
          shouldSelectOnPressUp: Boolean(
            isListDraggable || listBoxOptions.shouldSelectOnPressUp,
          ),
        }
      : {}),
  };

  const { listBoxProps } = useListBox(listBoxAriaOptions, state, listRef);

  return (
    <ListBoxCollection
      state={state}
      listBoxProps={listBoxProps}
      selectionMode={selectionMode}
      className={className}
      dragAndDropHooks={dragAndDropHooks}
      dragState={dragState}
      dropState={dropState}
      droppableCollectionProps={droppableCollectionProps}
      isRootDropTarget={isRootDropTarget}
      dragPreview={dragPreview}
      ref={composeRefs(listRef, ref)}
    />
  );
}

function ListBoxItem({
  id,
  textValue: _textValue,
  isDisabled: _isDisabled,
  children,
  className,
}: ListBoxItemProps) {
  const { state } = useListBoxContext("ListBoxItem");
  const key = id ?? _textValue ?? String(children);
  const item =
    state.collection.getItem(key) ??
    [...state.collection].find(
      (node) => node.type === "item" && String(node.key) === String(key),
    );

  if (item?.type !== "item") {
    return null;
  }

  return (
    <ListBoxItemRenderer item={item} className={className}>
      {children}
    </ListBoxItemRenderer>
  );
}
ListBoxItem.displayName = "ListBoxItem";

function ListBoxItemLabel({ className, ...props }: ListBoxItemLabelProps) {
  return (
    <span
      data-listbox-item-label=""
      className={cn(styles.itemLabel, className)}
      {...props}
    />
  );
}

function ListBoxItemDescription({
  className,
  ...props
}: ListBoxItemDescriptionProps) {
  return (
    <span
      data-listbox-item-description=""
      className={cn(styles.itemDescription, className)}
      {...props}
    />
  );
}

function ListBoxSection({ title, children, className }: ListBoxSectionProps) {
  return (
    <li data-listbox-section="" className={cn(styles.section, className)}>
      {title ? <ListBoxSectionHeader>{title}</ListBoxSectionHeader> : null}
      {/* biome-ignore lint/a11y/useSemanticElements: section subgroup for listbox items */}
      <ul role="group">{children}</ul>
    </li>
  );
}
ListBoxSection.displayName = "ListBoxSection";

function ListBoxSectionHeader({
  className,
  ...props
}: ListBoxSectionHeaderProps) {
  return (
    <div
      data-listbox-section-header=""
      className={cn(styles.sectionHeader, className)}
      {...props}
    />
  );
}

export type {
  ListBoxItemDescriptionProps,
  ListBoxItemLabelProps,
  ListBoxItemProps,
  ListBoxProps,
  ListBoxSectionHeaderProps,
  ListBoxSectionProps,
} from "./list-box.types";
export {
  ListBox,
  ListBoxContext,
  ListBoxItem,
  ListBoxItemDescription,
  ListBoxItemLabel,
  ListBoxSection,
  ListBoxSectionHeader,
};
