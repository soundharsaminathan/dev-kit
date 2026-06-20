import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type SidebarPlacement = "left" | "right";

export type SidebarProviderProps = ComponentPropsWithoutRef<"div"> & {
  defaultOpen?: boolean | undefined;
  isOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children?: ReactNode;
};

export type SidebarProps = ComponentPropsWithoutRef<"div"> & {
  placement?: SidebarPlacement | undefined;
  children?: ReactNode;
};

export type SidebarItemProps = ComponentPropsWithoutRef<"li"> & {
  tooltip?: ReactNode;
};

export type SidebarTooltipProps = {
  content: ReactNode;
  children: ReactNode;
};

export type SidebarContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

export type SidebarSectionContextValue = {
  headingId: string;
};
