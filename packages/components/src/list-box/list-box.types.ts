import type { AriaListBoxOptions } from "@react-aria/listbox";
import type { ListState } from "@react-stately/list";
import type { Node } from "@react-types/shared";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import type { DragAndDropHooks } from "../drag-and-drop";
import type { CollectionItem } from "./collection-utils";

export type ListBoxProps<T extends CollectionItem = CollectionItem> =
  AriaListBoxOptions<T> & {
    items?: Iterable<T> | undefined;
    children?: ReactNode;
    className?: string | undefined;
    dragAndDropHooks?: DragAndDropHooks | undefined;
    ref?: Ref<HTMLUListElement>;
  };

export type ListBoxItemProps = {
  id?: string | number | undefined;
  textValue?: string | undefined;
  isDisabled?: boolean | undefined;
  children?: ReactNode;
  className?: string | undefined;
  ref?: Ref<HTMLLIElement>;
};

export type ListBoxItemLabelProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>;
};

export type ListBoxItemDescriptionProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>;
};

export type ListBoxSectionProps = {
  title?: ReactNode;
  children?: ReactNode;
  className?: string | undefined;
};

export type ListBoxSectionHeaderProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>;
};

export type ListBoxContextValue<T extends object = CollectionItem> = {
  state: ListState<T>;
  selectionMode?: "single" | "multiple" | "none" | undefined;
};

export type ListBoxItemContextValue = {
  item: Node<CollectionItem>;
  isSelected: boolean;
  isDisabled: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isHovered: boolean;
  selectionMode: "single" | "multiple" | "none";
};
