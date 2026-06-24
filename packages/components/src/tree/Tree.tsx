import { cn, composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { useGridListSelectionCheckbox } from "@react-aria/gridlist";
import { useHover } from "@react-aria/interactions";
import { useTree, useTreeItem } from "@react-aria/tree";
import { mergeProps } from "@react-aria/utils";
import { Item } from "@react-stately/collections";
import { useTreeState } from "@react-stately/tree";
import type { CollectionElement, Key, Node } from "@react-types/shared";
import {
  Children,
  isValidElement,
  type ReactNode,
  useMemo,
  useRef,
} from "react";
import { Button } from "../button/Button";
import { CheckboxControl } from "../checkbox/Checkbox";
import styles from "./tree.module.scss";
import type {
  TreeItemContentProps,
  TreeItemProps,
  TreeNode,
  TreeProps,
} from "./tree.types";
import {
  TreeContext,
  TreeItemContext,
  useTreeContext,
  useTreeItemContext,
} from "./tree-context";

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ParsedTreeItem = {
  id: Key;
  textValue?: string | undefined;
  title?: ReactNode;
  isDisabled?: boolean | undefined;
  children?: ParsedTreeItem[];
};

function getItemTextValue(item: TreeNode | ParsedTreeItem): string {
  if (item.textValue) {
    return item.textValue;
  }
  if (typeof item.title === "string") {
    return item.title;
  }
  return String(item.id);
}

function augmentTreeCollection(
  collection: ReturnType<typeof useTreeState<TreeNode>>["collection"],
): ReturnType<typeof useTreeState<TreeNode>>["collection"] & {
  getChildren(key: Key): Iterable<Node<TreeNode>>;
} {
  if (
    "getChildren" in collection &&
    typeof collection.getChildren === "function"
  ) {
    return collection as ReturnType<
      typeof useTreeState<TreeNode>
    >["collection"] & {
      getChildren(key: Key): Iterable<Node<TreeNode>>;
    };
  }

  return Object.assign(collection, {
    getChildren(key: Key) {
      return {
        *[Symbol.iterator]() {
          const parent = collection.getItem(key);
          const children = parent?.value?.children;
          if (!children?.length) {
            return;
          }

          for (const child of children) {
            const item = collection.getItem(child.id);
            if (item) {
              yield item;
            }
          }
        },
      };
    },
  }) as ReturnType<typeof useTreeState<TreeNode>>["collection"] & {
    getChildren(key: Key): Iterable<Node<TreeNode>>;
  };
}

function getTreeCollectionChild(item: TreeNode): CollectionElement<TreeNode> {
  const label = item.title ?? getItemTextValue(item);
  const childItems = item.children;
  const disabledProps =
    item.isDisabled !== undefined ? { isDisabled: item.isDisabled } : {};

  return (
    <Item
      key={item.id}
      textValue={getItemTextValue(item)}
      {...(childItems && childItems.length > 0 ? { childItems } : {})}
      {...disabledProps}
    >
      {label}
    </Item>
  ) as CollectionElement<TreeNode>;
}

function isTreeItemElement(
  child: React.ReactElement,
): child is React.ReactElement<TreeItemProps> {
  return child.type === TreeItem;
}

function iterateVisibleTreeItems(
  collection: ReturnType<typeof useTreeState<TreeNode>>["collection"],
): Iterable<Node<TreeNode>> {
  return {
    *[Symbol.iterator]() {
      let key = collection.getFirstKey();
      while (key != null) {
        const node = collection.getItem(key);
        if (node?.type === "item") {
          yield node;
        }
        key = collection.getKeyAfter(key);
      }
    },
  };
}

function parseTreeItemChildren(children: ReactNode): {
  content: ReactNode[];
  nestedItems: ParsedTreeItem[];
} {
  const content: ReactNode[] = [];
  const nestedItems: ParsedTreeItem[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      if (child != null && child !== false) {
        content.push(child);
      }
      return;
    }

    if (isTreeItemElement(child)) {
      nestedItems.push(parseTreeItemElement(child));
      return;
    }

    const type = child.type as { displayName?: string };
    if (type.displayName === "TreeItemContent") {
      return;
    }
    content.push(child);
  });

  return { content, nestedItems };
}

function parseTreeItemElement(
  element: React.ReactElement<TreeItemProps>,
): ParsedTreeItem {
  const props = element.props;
  const label = props.children;
  const { content, nestedItems } = parseTreeItemChildren(label);
  const title =
    content.length === 1
      ? content[0]
      : content.length > 0
        ? content
        : props.textValue;

  return {
    id: props.id ?? props.textValue ?? String(title),
    textValue: props.textValue,
    title,
    ...(props.isDisabled !== undefined ? { isDisabled: props.isDisabled } : {}),
    ...(nestedItems.length > 0 ? { children: nestedItems } : {}),
  };
}

function parseStaticTreeItems(children: ReactNode): ParsedTreeItem[] {
  const items: ParsedTreeItem[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }
    if (!isTreeItemElement(child)) {
      return;
    }
    items.push(parseTreeItemElement(child));
  });

  return items;
}

function parsedItemsToTreeNodes(items: ParsedTreeItem[]): TreeNode[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    ...(item.textValue !== undefined ? { textValue: item.textValue } : {}),
    ...(item.isDisabled !== undefined ? { isDisabled: item.isDisabled } : {}),
    ...(item.children
      ? { children: parsedItemsToTreeNodes(item.children) }
      : {}),
  }));
}

function getDisabledKeys(items: TreeNode[]): Set<Key> {
  const keys = new Set<Key>();

  function visit(nodes: TreeNode[]) {
    for (const item of nodes) {
      if (item.isDisabled) {
        keys.add(item.id);
      }
      if (item.children) {
        visit(item.children);
      }
    }
  }

  visit(items);
  return keys;
}

function nodeHasChildItems(
  node: Node<TreeNode>,
  state: ReturnType<typeof useTreeState<TreeNode>>,
): boolean {
  const children = state.collection.getChildren?.(node.key);
  const childItems = children
    ? [...children].filter((child) => child.type === "item")
    : [];
  if (childItems.length > 0) {
    return true;
  }
  return (node.value?.children?.length ?? 0) > 0;
}

function Tree<T extends TreeNode>({
  items: itemsProp,
  children,
  className,
  ref,
  selectionMode = "none",
  disabledKeys: disabledKeysProp,
  selectionBehavior: selectionBehaviorProp,
  shouldSelectOnPressUp: shouldSelectOnPressUpProp,
  ...props
}: TreeProps<T>) {
  const treeRef = useRef<HTMLDivElement>(null);
  const isRenderProp = typeof children === "function";

  const treeOptions = {
    ...props,
    selectionMode,
    ...(selectionBehaviorProp != null
      ? { selectionBehavior: selectionBehaviorProp }
      : selectionMode === "multiple"
        ? { selectionBehavior: "toggle" as const }
        : {}),
    ...(shouldSelectOnPressUpProp != null
      ? { shouldSelectOnPressUp: shouldSelectOnPressUpProp }
      : selectionMode === "multiple"
        ? { shouldSelectOnPressUp: true }
        : {}),
  };

  const staticItems = useMemo(() => {
    if (itemsProp || isRenderProp) {
      return null;
    }
    return parsedItemsToTreeNodes(parseStaticTreeItems(children));
  }, [children, isRenderProp, itemsProp]);

  const resolvedItems = useMemo(() => {
    if (itemsProp) {
      return [...itemsProp] as TreeNode[];
    }
    return staticItems ?? [];
  }, [itemsProp, staticItems]);

  const disabledKeys = useMemo(() => {
    if (disabledKeysProp) {
      return disabledKeysProp;
    }
    return getDisabledKeys(resolvedItems);
  }, [disabledKeysProp, resolvedItems]);

  const baseState = useTreeState<TreeNode>({
    ...treeOptions,
    disabledKeys,
    items: resolvedItems,
    children: getTreeCollectionChild,
  });

  const state = useMemo(() => {
    const collection = augmentTreeCollection(baseState.collection);
    return { ...baseState, collection };
  }, [baseState]);

  const { gridProps } = useTree(treeOptions, state, treeRef);
  const renderItem = isRenderProp
    ? (children as (item: T) => ReactNode)
    : undefined;

  const contextValue = useMemo(
    () => ({
      state,
      selectionMode,
      renderItem: renderItem as ((item: TreeNode) => ReactNode) | undefined,
    }),
    [renderItem, selectionMode, state],
  );

  return (
    <TreeContext.Provider value={contextValue}>
      <div
        {...gridProps}
        ref={composeRefs(treeRef, ref)}
        data-tree=""
        data-selection-mode={selectionMode}
        className={cn(styles.root, className)}
      >
        {Array.from(iterateVisibleTreeItems(state.collection), (node) => (
          <TreeItemRenderer key={node.key} node={node} />
        ))}
      </div>
    </TreeContext.Provider>
  );
}

function TreeItemRenderer({ node }: { node: Node<TreeNode> }) {
  const { state, selectionMode, renderItem } =
    useTreeContext("TreeItemRenderer");
  const ref = useRef<HTMLDivElement>(null);
  const hasChildItems = nodeHasChildItems(node, state);
  const isExpanded = state.expandedKeys.has(node.key);

  const {
    rowProps,
    gridCellProps,
    expandButtonProps,
    isSelected,
    isDisabled,
    isFocused,
  } = useTreeItem({ node, hasChildItems }, state, ref);
  const { checkboxProps } = useGridListSelectionCheckbox(
    { key: node.key },
    state,
  );
  const selectionBehavior = state.selectionManager.selectionBehavior;
  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const itemContext = useMemo(
    () => ({
      node,
      hasChildItems,
      isExpanded,
      isSelected,
      isDisabled,
      isFocused,
      isFocusVisible,
      isHovered,
      selectionMode,
      selectionBehavior,
      checkboxProps,
      expandButtonProps,
    }),
    [
      checkboxProps,
      expandButtonProps,
      hasChildItems,
      isDisabled,
      isExpanded,
      isFocused,
      isFocusVisible,
      isHovered,
      isSelected,
      node,
      selectionBehavior,
      selectionMode,
    ],
  );

  const renderedContent = renderItem ? (
    renderItem(node.value as TreeNode)
  ) : (
    <TreeItemContent>{node.rendered}</TreeItemContent>
  );

  return (
    <TreeItemContext.Provider value={itemContext}>
      <div
        {...mergeProps(rowProps, hoverProps, focusProps)}
        ref={ref}
        data-tree-item=""
        data-level={node.level}
        data-expanded={isExpanded ? "true" : undefined}
        data-selected={isSelected ? "true" : undefined}
        data-disabled={isDisabled ? "true" : undefined}
        data-hovered={isHovered ? "true" : undefined}
        data-focused={isFocused ? "true" : undefined}
        data-focus-visible={isFocusVisible ? "true" : undefined}
        className={styles.item}
      >
        <div
          {...gridCellProps}
          data-tree-item-content=""
          className={styles.itemContent}
          style={
            node.level > 0
              ? {
                  paddingInlineStart: `calc(${node.level} * var(--tree-indent))`,
                }
              : undefined
          }
        >
          {renderedContent}
        </div>
      </div>
    </TreeItemContext.Provider>
  );
}

function TreeItemContent({ children, className }: TreeItemContentProps) {
  const {
    hasChildItems,
    isExpanded,
    isDisabled,
    selectionMode,
    selectionBehavior,
    checkboxProps,
    expandButtonProps,
  } = useTreeItemContext("TreeItemContent");

  return (
    <div
      data-tree-item-content-row=""
      className={cn(styles.itemContentRow, className)}
    >
      {hasChildItems ? (
        <Button
          {...expandButtonProps}
          variant="quiet"
          size="sm"
          isIconOnly
          isDisabled={isDisabled}
          data-expanded={isExpanded ? "true" : undefined}
          className={styles.expandButton}
        >
          <ChevronRightIcon />
        </Button>
      ) : (
        <span
          data-tree-item-spacer=""
          className={styles.spacer}
          aria-hidden="true"
        />
      )}
      {selectionBehavior === "toggle" && selectionMode !== "none" ? (
        <CheckboxControl {...checkboxProps} />
      ) : null}
      {children}
    </div>
  );
}

function TreeItem({
  id: _id,
  textValue: _textValue,
  isDisabled: _isDisabled,
  children: _children,
  className: _className,
}: TreeItemProps) {
  return null;
}
TreeItem.displayName = "TreeItem";

TreeItemContent.displayName = "TreeItemContent";

export type {
  TreeItemContentProps,
  TreeItemProps,
  TreeNode,
  TreeProps,
} from "./tree.types";
export { Tree, TreeItem, TreeItemContent };
