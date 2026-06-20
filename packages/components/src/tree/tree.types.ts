import type { AriaTreeOptions } from "@react-aria/tree";
import type { TreeProps as TreeStateProps } from "@react-stately/tree";
import type { Key, SelectionBehavior } from "@react-types/shared";
import type { ReactNode, Ref } from "react";

export type TreeNode = {
  id: Key;
  title?: ReactNode;
  textValue?: string;
  children?: TreeNode[];
  isDisabled?: boolean;
};

export type TreeProps<T extends TreeNode = TreeNode> = Omit<
  AriaTreeOptions<T>,
  "children"
> &
  Omit<TreeStateProps<T>, "children"> & {
    items?: Iterable<T>;
    children?: ReactNode | ((item: T) => ReactNode);
    className?: string;
    "aria-label"?: string;
    ref?: Ref<HTMLDivElement>;
    selectionBehavior?: SelectionBehavior;
    shouldSelectOnPressUp?: boolean;
  };

export type TreeItemProps = {
  id?: Key;
  textValue?: string;
  isDisabled?: boolean;
  children?: ReactNode;
  className?: string;
};

export type TreeItemContentProps = {
  children?: ReactNode;
  className?: string;
};
