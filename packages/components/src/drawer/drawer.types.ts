import type * as React from "react";

export type DrawerPlacement = "top" | "bottom" | "left" | "right";

export type DrawerSizing = "static" | "dynamic";

export type DrawerPopupClassName =
  | string
  | ((state: { open: boolean }) => string | undefined);

export interface DrawerProps {
  placement?: DrawerPlacement | undefined;
  /** `static` keeps a fixed side-drawer width; `dynamic` hugs content. */
  sizing?: DrawerSizing | undefined;
  isOpen?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  swipeToDismiss?: boolean | undefined;
  isDismissable?: boolean | undefined;
  isKeyboardDismissDisabled?: boolean | undefined;
  className?: DrawerPopupClassName | undefined;
  style?: React.CSSProperties | undefined;
  children?: React.ReactNode;
}

export interface DrawerHandleProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export interface DrawerSwipeAreaProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export interface DrawerProviderProps {
  children?: React.ReactNode;
}

export interface DrawerIndentProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export interface DrawerIndentBackgroundProps
  extends React.ComponentPropsWithoutRef<"div"> {}
