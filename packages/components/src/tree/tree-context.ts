import type { AriaButtonProps } from "@react-aria/button";
import type { AriaCheckboxProps } from "@react-aria/checkbox";
import type { TreeState } from "@react-stately/tree";
import type { Node, SelectionBehavior } from "@react-types/shared";
import { createContext, useContext } from "react";
import type { TreeNode } from "./tree.types";

export type TreeContextValue = {
  state: TreeState<TreeNode>;
  selectionMode: "none" | "single" | "multiple";
  renderItem?: ((item: TreeNode) => React.ReactNode) | undefined;
};

export type TreeItemContextValue = {
  node: Node<TreeNode>;
  hasChildItems: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isHovered: boolean;
  selectionMode: "none" | "single" | "multiple";
  selectionBehavior: SelectionBehavior;
  checkboxProps?: AriaCheckboxProps | undefined;
  expandButtonProps: AriaButtonProps;
};

export const TreeContext = createContext<TreeContextValue | null>(null);
export const TreeItemContext = createContext<TreeItemContextValue | null>(null);

export function useTreeContext(component: string): TreeContextValue {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error(`${component} must be used within Tree`);
  }
  return context;
}

export function useTreeItemContext(component: string): TreeItemContextValue {
  const context = useContext(TreeItemContext);
  if (!context) {
    throw new Error(`${component} must be used within TreeItem`);
  }
  return context;
}
