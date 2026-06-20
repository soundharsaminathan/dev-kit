import type { DrawerProps } from "../drawer/drawer.types";
import type { ModalProps } from "../modal/modal.types";
import type { PopoverProps } from "../popover/popover.types";

export type OverlayType = "modal" | "popover" | "drawer";

export type OverlayProps = {
  children?: React.ReactNode;
  isDismissable?: boolean | undefined;
  isOpen?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  isKeyboardDismissDisabled?: boolean | undefined;
  shouldCloseOnInteractOutside?: ((element: Element) => boolean) | undefined;
  type?: OverlayType | undefined;
  mobileType?: OverlayType | null | undefined;
  popoverProps?: Omit<PopoverProps, "children"> | undefined;
  modalProps?: Omit<ModalProps, "children"> | undefined;
  drawerProps?: Omit<DrawerProps, "children"> | undefined;
};
