import { useIsMobile } from "@dev-ui/hooks";
import { useContext } from "react";
import { DialogContext } from "../dialog/dialog-context";
import { Drawer } from "../drawer/Drawer";
import { Modal } from "../modal/Modal";
import { Popover, PopoverProvider } from "../popover/Popover";
import type { OverlayProps } from "./overlay.types";

function Overlay({
  type = "modal",
  mobileType = "drawer",
  modalProps,
  popoverProps,
  drawerProps,
  children,
  isOpen,
  defaultOpen,
  onOpenChange,
  isDismissable,
  isKeyboardDismissDisabled,
  shouldCloseOnInteractOutside,
}: OverlayProps) {
  const isMobile = useIsMobile();
  const resolvedType = mobileType ? (isMobile ? mobileType : type) : type;
  const dialogContext = useContext(DialogContext);

  if (resolvedType === "popover") {
    if (dialogContext) {
      return (
        <PopoverProvider
          value={{
            triggerRef: dialogContext.triggerRef,
            state: dialogContext.overlayState,
            popoverRef: dialogContext.panelRef,
            placement: popoverProps?.placement,
            offset: popoverProps?.offset,
          }}
        >
          <Popover {...popoverProps}>{children}</Popover>
        </PopoverProvider>
      );
    }

    return <Popover {...popoverProps}>{children}</Popover>;
  }

  if (resolvedType === "drawer") {
    const drawerOpenProps = dialogContext
      ? {
          isOpen: dialogContext.overlayState.isOpen,
          onOpenChange: dialogContext.overlayState.setOpen,
        }
      : {
          ...(isOpen !== undefined ? { isOpen } : {}),
          ...(defaultOpen !== undefined ? { defaultOpen } : {}),
          ...(onOpenChange !== undefined ? { onOpenChange } : {}),
        };

    return (
      <Drawer
        {...drawerProps}
        {...drawerOpenProps}
        {...(isDismissable !== undefined ? { isDismissable } : {})}
        {...(isKeyboardDismissDisabled !== undefined
          ? { isKeyboardDismissDisabled }
          : {})}
      >
        {children}
      </Drawer>
    );
  }

  return (
    <Modal
      {...modalProps}
      {...(isDismissable !== undefined ? { isDismissable } : {})}
      {...(isKeyboardDismissDisabled !== undefined
        ? { isKeyboardDismissDisabled }
        : {})}
      {...(shouldCloseOnInteractOutside !== undefined
        ? { shouldCloseOnInteractOutside }
        : {})}
    >
      {children}
    </Modal>
  );
}

Overlay.displayName = "Modal";

export { Overlay };
