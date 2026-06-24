import type { AriaGridListOptions } from "@react-aria/gridlist";
import type { ListProps } from "@react-stately/list";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import type { CollectionItem } from "../list-box/collection-utils";

export type GridListProps<T extends CollectionItem = CollectionItem> = Omit<
  ListProps<T>,
  "children"
> &
  Omit<AriaGridListOptions<T>, "children"> & {
    children?: ReactNode;
    className?: string | undefined;
    ref?: Ref<HTMLDivElement>;
    items?: Iterable<T> | undefined;
    selectionMode?: "single" | "multiple" | "none" | undefined;
  };

export type GridListItemProps = {
  id?: string | number | undefined;
  textValue?: string | undefined;
  isDisabled?: boolean | undefined;
  children?: ReactNode;
  className?: string | undefined;
};

export type GridListItemLabelProps = ComponentPropsWithoutRef<"span">;
