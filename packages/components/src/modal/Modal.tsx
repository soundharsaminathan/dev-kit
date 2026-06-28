import { cn } from "@dev-ui/core";
import {
  DismissButton,
  Overlay,
  OverlayContainer,
  useModalOverlay,
} from "@react-aria/overlays";
import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
} from "motion/react";
import { useDialogContext } from "../dialog/dialog-context";
import {
  getBackdropMotion,
  getBackdropTransition,
  getModalPanelMotion,
  getOverlayTransition,
} from "../motion/overlay-motion";
import styles from "./modal.module.scss";
import type { ModalProps } from "./modal.types";

function Modal({
  children,
  className,
  isDismissable = true,
  ...props
}: ModalProps) {
  const reducedMotion = useReducedMotion();
  const { overlayState, panelRef } = useDialogContext("Modal");
  const { modalProps, underlayProps } = useModalOverlay(
    { isDismissable, ...props },
    overlayState,
    panelRef,
  );
  const { style: _backdropStyle, ...backdropProps } = underlayProps;
  const { style: _panelStyle, ...panelMotionProps } = modalProps;
  const backdropMotion = getBackdropMotion(reducedMotion);
  const panelMotion = getModalPanelMotion(reducedMotion);

  return (
    <OverlayContainer>
      <AnimatePresence>
        {overlayState.isOpen ? (
          <Overlay key="modal">
            <motion.div
              {...(backdropProps as unknown as HTMLMotionProps<"div">)}
              initial={backdropMotion.initial}
              animate={backdropMotion.animate}
              exit={backdropMotion.exit}
              transition={getBackdropTransition(reducedMotion)}
              data-modal-backdrop=""
              className={styles.backdrop}
            />
            <div data-modal-viewport="" className={styles.viewport}>
              <motion.div
                {...(panelMotionProps as unknown as HTMLMotionProps<"div">)}
                ref={panelRef}
                initial={panelMotion.initial}
                animate={panelMotion.animate}
                exit={panelMotion.exit}
                transition={getOverlayTransition(reducedMotion)}
                data-modal=""
                className={cn(styles.panel, className)}
              >
                {children}
                <DismissButton onDismiss={overlayState.close} />
              </motion.div>
            </div>
          </Overlay>
        ) : null}
      </AnimatePresence>
    </OverlayContainer>
  );
}
Modal.displayName = "Modal";

export type { ModalProps } from "./modal.types";
export { Modal };
