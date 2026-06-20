import { cn, composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import type { AriaListBoxOptions } from "@react-aria/listbox";
import { useListBox, useOption } from "@react-aria/listbox";
import { mergeProps } from "@react-aria/utils";
import type { ListProps, ListState } from "@react-stately/list";
import { useListState } from "@react-stately/list";
import type { Node } from "@react-types/shared";
import {
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useOptionalCommandContext } from "../command/command-context";
import {
  type CollectionItem,
  getCollectionChild,
  getDisabledKeys,
  parseCollectionItems,
} from "./collection-utils";
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
  ref?: Ref<HTMLUListElement>;
};

function ListBoxCollection<T extends object>({
  state,
  listBoxProps,
  selectionMode,
  className,
  standalone,
  ref,
}: Omit<ListBoxCollectionProps<T>, "children">) {
  const contextValue = useMemo(
    () => ({
      state: state as ListState<CollectionItem>,
      selectionMode,
    }),
    [state, selectionMode],
  );

  return (
    <ListBoxContext.Provider value={contextValue}>
      <ul
        {...listBoxProps}
        ref={ref}
        data-listbox=""
        data-standalone={standalone ? "true" : undefined}
        className={cn(styles.root, className)}
      >
        {renderCollectionItems(state)}
      </ul>
    </ListBoxContext.Provider>
  );
}

function renderCollectionItems<T extends object>(state: ListState<T>) {
  return [...state.collection].map((item) => {
    if (item.type === "item") {
      return (
        <ListBoxItemRenderer key={item.key} item={item}>
          {(item.value as CollectionItem).label}
        </ListBoxItemRenderer>
      );
    }
    return null;
  });
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
      </li>
    </ListBoxItemContext.Provider>
  );
}

function filterCollectionNodes<T extends object>(
  nodes: Iterable<Node<T>>,
  nodeFilter: (nodeTextValue: string) => boolean,
): Iterable<Node<T>> {
  const filtered: Node<T>[] = [];

  for (const node of nodes) {
    if (node.type === "section") {
      const childNodes = [
        ...filterCollectionNodes(node.childNodes ?? [], nodeFilter),
      ];
      if (childNodes.length > 0) {
        filtered.push({ ...node, childNodes });
      }
      continue;
    }

    if (node.type === "item") {
      if (nodeFilter(String(node.textValue ?? ""))) {
        filtered.push(node);
      }
      continue;
    }

    filtered.push(node);
  }

  return filtered;
}

function ListBox<T extends CollectionItem>({
  ref,
  items: itemsProp,
  children,
  className,
  selectionMode = "single",
  ...props
}: ListBoxProps<T>) {
  const command = useOptionalCommandContext();
  const listRef = useRef<HTMLUListElement>(null);
  const resolvedListRef = command?.collectionRef ?? listRef;
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

  const collectionFilter = useMemo(() => {
    if (!command?.nodeFilter) {
      return undefined;
    }

    const nodeFilter = command.nodeFilter;
    return (nodes: Iterable<Node<T>>) =>
      filterCollectionNodes(nodes, nodeFilter);
  }, [command?.nodeFilter]);

  const state = useListState(
    (collectionFilter
      ? { ...listStateProps, filter: collectionFilter }
      : listStateProps) as ListProps<T>,
  );

  const { listBoxProps } = useListBox(
    command
      ? { ...props, selectionMode, ...command.collectionProps }
      : { ...props, selectionMode },
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
      ref={composeRefs(resolvedListRef, ref)}
    />
  );
}

export function ListBoxWithState<T extends object>({
  state,
  listBoxOptions,
  className,
  ref,
}: {
  state: ListState<T>;
  listBoxOptions: AriaListBoxOptions<T>;
  className?: string | undefined;
  ref?: Ref<HTMLUListElement>;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const selectionMode = listBoxOptions.selectionMode ?? "single";
  const { listBoxProps } = useListBox(listBoxOptions, state, listRef);

  return (
    <ListBoxCollection
      state={state}
      listBoxProps={listBoxProps}
      selectionMode={selectionMode}
      className={className}
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
