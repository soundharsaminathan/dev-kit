import { cn } from "@dev-ui/core";
import {
  DismissButton,
  Overlay,
  OverlayContainer,
  useModalOverlay,
} from "@react-aria/overlays";
import { useDialogContext } from "../dialog/dialog-context";
import styles from "./modal.module.scss";
import type { ModalProps } from "./modal.types";

function Modal({
  children,
  className,
  isDismissable = true,
  ...props
}: ModalProps) {
  const { overlayState, panelRef } = useDialogContext("Modal");
  const { modalProps, underlayProps } = useModalOverlay(
    { isDismissable, ...props },
    overlayState,
    panelRef,
  );

  if (!overlayState.isOpen) {
    return null;
  }

  return (
    <OverlayContainer>
      <Overlay>
        <div
          {...underlayProps}
          data-modal-backdrop=""
          className={styles.backdrop}
        />
        <div data-modal-viewport="" className={styles.viewport}>
          <div
            {...modalProps}
            ref={panelRef}
            data-modal=""
            className={cn(styles.panel, className)}
          >
            {children}
            <DismissButton onDismiss={overlayState.close} />
          </div>
        </div>
      </Overlay>
    </OverlayContainer>
  );
}
Modal.displayName = "Modal";

export type { ModalProps } from "./modal.types";
export { Modal };
