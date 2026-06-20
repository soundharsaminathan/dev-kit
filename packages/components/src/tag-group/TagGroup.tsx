import { cn } from "@dev-ui/core";
import { useButton } from "@react-aria/button";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import { useTag, useTagGroup } from "@react-aria/tag";
import { mergeProps } from "@react-aria/utils";
import { Item } from "@react-stately/collections";
import { useTagGroupState } from "@react-stately/tag";
import type { CollectionElement, Node } from "@react-types/shared";
import {
  Children,
  isValidElement,
  type ReactNode,
  useMemo,
  useRef,
} from "react";
import { findChildByDisplayName } from "../list-box/collection-utils";
import styles from "./tag-group.module.scss";
import type {
  TagGroupLabelProps,
  TagGroupProps,
  TagItem,
  TagListProps,
  TagProps,
} from "./tag-group.types";
import { TagGroupContext, useTagGroupContext } from "./tag-group-context";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function parseTagItems(children: ReactNode): TagItem[] {
  const items: TagItem[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }
    const type = child.type as { displayName?: string };
    if (type.displayName !== "Tag") {
      return;
    }
    const props = child.props as TagProps;
    const label = props.children;
    const id = props.id ?? props.textValue ?? String(label);
    items.push({
      id,
      label,
      textValue:
        props.textValue ?? (typeof label === "string" ? label : undefined),
      ...(props.isDisabled !== undefined
        ? { isDisabled: props.isDisabled }
        : {}),
      ...(props.href !== undefined ? { href: props.href } : {}),
    });
  });

  return items;
}

function getTagCollectionChild(item: TagItem): CollectionElement<TagItem> {
  return (
    <Item
      key={item.id}
      textValue={
        item.textValue ??
        (typeof item.label === "string" ? item.label : String(item.id))
      }
      {...(item.href !== undefined ? { href: item.href } : {})}
      {...(item.isDisabled !== undefined
        ? { isDisabled: item.isDisabled }
        : {})}
    >
      {item.label}
    </Item>
  ) as CollectionElement<TagItem>;
}

function TagGroup({
  children,
  className,
  size = "md",
  onRemove,
  ...props
}: TagGroupProps<TagItem>) {
  const listRef = useRef<HTMLDivElement>(null);
  const tagListChild = findChildByDisplayName(children, "TagList");
  const tagItems = useMemo(
    () =>
      parseTagItems(
        tagListChild
          ? (tagListChild.props as { children?: ReactNode }).children
          : null,
      ),
    [tagListChild],
  );

  const state = useTagGroupState({
    ...props,
    items: tagItems,
    children: getTagCollectionChild,
  });

  const { labelProps, descriptionProps, errorMessageProps, gridProps } =
    useTagGroup(
      {
        ...props,
        ...(onRemove !== undefined ? { onRemove } : {}),
      },
      state,
      listRef,
    );

  const contextValue = useMemo(
    () => ({
      state,
      gridProps,
      labelProps,
      descriptionProps,
      errorMessageProps,
      listRef,
      size,
    }),
    [state, gridProps, labelProps, descriptionProps, errorMessageProps, size],
  );

  return (
    <TagGroupContext.Provider value={contextValue}>
      <div
        data-tag-group=""
        data-size={size}
        className={cn(styles.tagGroup, className)}
      >
        {children}
      </div>
    </TagGroupContext.Provider>
  );
}

function TagGroupLabel({ className, ...props }: TagGroupLabelProps) {
  const { labelProps } = useTagGroupContext("TagGroupLabel");
  return (
    <span
      {...mergeProps(labelProps, props)}
      data-tag-group-label=""
      className={cn(styles.tagGroupLabel, className)}
    />
  );
}

function TagList({ className, children: _children, ...props }: TagListProps) {
  const { gridProps, listRef, state, size } = useTagGroupContext("TagList");

  return (
    <div
      {...mergeProps(gridProps, props)}
      ref={listRef}
      data-tag-list=""
      data-size={size}
      className={cn(styles.tagList, className)}
    >
      {[...state.collection].map((node) => (
        <TagRenderer key={node.key} node={node} />
      ))}
    </div>
  );
}
TagList.displayName = "TagList";

function TagRenderer({ node }: { node: Node<TagItem> }) {
  const { state } = useTagGroupContext("Tag");
  const ref = useRef<HTMLDivElement>(null);
  const {
    rowProps,
    gridCellProps,
    allowsRemoving,
    removeButtonProps,
    isSelected,
    isDisabled,
    isFocused,
  } = useTag({ item: node }, state, ref);
  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocusVisible } = useFocusRing();
  const removeRef = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(removeButtonProps, removeRef);
  const href = node.value?.href;

  return (
    <div
      {...mergeProps(rowProps, hoverProps, focusProps)}
      ref={ref}
      data-tag=""
      data-selected={isSelected ? "true" : undefined}
      data-disabled={isDisabled ? "true" : undefined}
      data-hovered={isHovered ? "true" : undefined}
      data-focused={isFocused ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      data-href={href ? "true" : undefined}
      className={styles.tag}
    >
      <span {...gridCellProps} data-slot="label">
        {node.rendered}
      </span>
      {allowsRemoving ? (
        <button
          {...buttonProps}
          ref={removeRef}
          type="button"
          data-slot="remove"
          className={styles.remove}
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}

function Tag({
  id: _id,
  textValue: _textValue,
  isDisabled: _isDisabled,
  href: _href,
  children: _children,
  className: _className,
}: TagProps) {
  return null;
}
Tag.displayName = "Tag";

export type {
  TagGroupLabelProps,
  TagGroupProps,
  TagListProps,
  TagProps,
} from "./tag-group.types";
export { Tag, TagGroup, TagGroupLabel, TagList };
