import { cn, composeRefs } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { useFocusRing } from "@react-aria/focus";
import { useGridList, useGridListItem } from "@react-aria/gridlist";
import { useHover } from "@react-aria/interactions";
import { mergeProps } from "@react-aria/utils";
import type { ListProps, ListState } from "@react-stately/list";
import { useListState } from "@react-stately/list";
import type { Node } from "@react-types/shared";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  type CollectionItem,
  getCollectionChild,
  getDisabledKeys,
  parseCollectionItems,
} from "../list-box/collection-utils";
import styles from "./grid-list.module.scss";
import type {
  GridListItemLabelProps,
  GridListItemProps,
  GridListProps,
} from "./grid-list.types";

type GridListContextValue = {
  state: ListState<CollectionItem>;
  selectionMode: "single" | "multiple" | "none";
};

const GridListContext = createContext<GridListContextValue | null>(null);
const GridListItemContext = createContext<{
  isSelected: boolean;
  isDisabled: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isHovered: boolean;
  selectionMode: "single" | "multiple" | "none";
} | null>(null);

function useGridListContext(component: string): GridListContextValue {
  const context = useContext(GridListContext);
  if (!context) {
    throw new Error(`${component} must be used within GridList`);
  }
  return context;
}

function GridListItemRenderer({
  item,
  children,
  className,
}: {
  item: Node<CollectionItem>;
  children: ReactNode;
  className?: string | undefined;
}) {
  const { state, selectionMode } = useGridListContext("GridListItem");
  const ref = useRef<HTMLDivElement>(null);
  const { rowProps, gridCellProps, isSelected, isDisabled } = useGridListItem(
    { node: item },
    state,
    ref,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocused, isFocusVisible } = useFocusRing();

  const itemContext = useMemo(
    () => ({
      isSelected,
      isDisabled,
      isFocused,
      isFocusVisible,
      isHovered,
      selectionMode,
    }),
    [
      isSelected,
      isDisabled,
      isFocused,
      isFocusVisible,
      isHovered,
      selectionMode,
    ],
  );

  return (
    <GridListItemContext.Provider value={itemContext}>
      <div
        {...mergeProps(rowProps, hoverProps, focusProps)}
        ref={ref}
        data-grid-list-item=""
        data-selected={isSelected ? "true" : undefined}
        data-disabled={isDisabled ? "true" : undefined}
        data-hovered={isHovered ? "true" : undefined}
        data-focused={isFocused ? "true" : undefined}
        data-focus-visible={isFocusVisible ? "true" : undefined}
        data-selection-mode={selectionMode}
        className={cn(styles.item, className)}
      >
        <div {...gridCellProps}>
          {typeof children === "string" ? (
            <GridListItemLabel>{children}</GridListItemLabel>
          ) : (
            children
          )}
        </div>
        {selectionMode !== "none" && isSelected ? (
          <span data-grid-list-item-indicator="" className={styles.indicator}>
            <Icon name="check" className={styles.checkIcon} />
          </span>
        ) : null}
      </div>
    </GridListItemContext.Provider>
  );
}

function renderGridItems(state: ListState<CollectionItem>) {
  return [...state.collection].map((item) => {
    if (item.type === "item") {
      return (
        <GridListItemRenderer key={item.key} item={item}>
          {(item.value as CollectionItem).label}
        </GridListItemRenderer>
      );
    }
    return null;
  });
}

function GridList<T extends CollectionItem>({
  ref,
  items: itemsProp,
  children,
  className,
  selectionMode = "single",
  ...props
}: GridListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemsList = useMemo((): CollectionItem[] => {
    if (itemsProp) {
      return [...itemsProp];
    }
    return parseCollectionItems(children, "GridListItem");
  }, [itemsProp, children]);

  const listStateProps = {
    ...props,
    items: itemsList as Iterable<T>,
    selectionMode,
    children: getCollectionChild,
    disabledKeys: getDisabledKeys(itemsList),
  };

  const state = useListState(listStateProps as ListProps<T>);
  const { gridProps } = useGridList(
    { ...props, selectionMode },
    state,
    listRef,
  );

  const contextValue = useMemo(
    () => ({
      state: state as ListState<CollectionItem>,
      selectionMode,
    }),
    [state, selectionMode],
  );

  return (
    <GridListContext.Provider value={contextValue}>
      <div
        {...gridProps}
        ref={composeRefs(listRef, ref)}
        data-grid-list=""
        className={cn(styles.root, className)}
      >
        {renderGridItems(state as ListState<CollectionItem>)}
      </div>
    </GridListContext.Provider>
  );
}

function GridListItem({
  id,
  textValue: _textValue,
  isDisabled: _isDisabled,
  children,
  className,
}: GridListItemProps) {
  const { state } = useGridListContext("GridListItem");
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
    <GridListItemRenderer item={item} className={className}>
      {children}
    </GridListItemRenderer>
  );
}
GridListItem.displayName = "GridListItem";

function GridListItemLabel({ className, ...props }: GridListItemLabelProps) {
  return (
    <span
      data-grid-list-item-label=""
      className={cn(styles.itemLabel, className)}
      {...props}
    />
  );
}

export type {
  GridListItemLabelProps,
  GridListItemProps,
  GridListProps,
} from "./grid-list.types";
export { GridList, GridListItem, GridListItemLabel };
