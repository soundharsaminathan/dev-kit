import type { AriaMenuOptions, AriaMenuTriggerProps } from "@react-aria/menu";
import type { Placement } from "@react-aria/overlays";
import type { MenuTriggerState } from "@react-stately/menu";
import type { OverlayTriggerProps } from "@react-stately/overlays";
import type { Node } from "@react-types/shared";
import type { ReactNode, Ref } from "react";
import type { CollectionItem } from "../list-box/collection-utils";

export type MenuProps = Omit<AriaMenuTriggerProps, "children"> &
  OverlayTriggerProps & {
    children?: ReactNode;
    className?: string | undefined;
  };

export type MenuContentProps<T extends CollectionItem = CollectionItem> =
  AriaMenuOptions<T> & {
    children?: ReactNode;
    className?: string | undefined;
    placement?: Placement | undefined;
    portalContainer?: Element | undefined;
  };

export type MenuItemProps = {
  id?: string | number | undefined;
  textValue?: string | undefined;
  isDisabled?: boolean | undefined;
  variant?: "default" | "danger" | undefined;
  children?: ReactNode;
  className?: string | undefined;
  ref?: Ref<HTMLLIElement>;
};

export type MenuItemLabelProps = React.ComponentPropsWithoutRef<"span">;
export type MenuItemDescriptionProps = React.ComponentPropsWithoutRef<"span">;

export type MenuSectionProps = {
  title?: ReactNode;
  children?: ReactNode;
  className?: string | undefined;
};

export type MenuSectionHeaderProps = React.ComponentPropsWithoutRef<"div">;

export type MenuContextValue<T extends object = CollectionItem> = {
  overlayState: MenuTriggerState;
  triggerRef: React.RefObject<Element | null>;
  menuTriggerProps: React.DOMAttributes<HTMLElement>;
  menuProps: AriaMenuOptions<T>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  menuRef: React.RefObject<HTMLElement | null>;
  itemsList: CollectionItem[];
  portalContainer?: Element | undefined;
};

export type MenuItemContextValue = {
  item: Node<CollectionItem>;
  isSelected: boolean;
  isDisabled: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isHovered: boolean;
  selectionMode: "single" | "multiple" | "none";
  variant?: "default" | "danger" | undefined;
};
