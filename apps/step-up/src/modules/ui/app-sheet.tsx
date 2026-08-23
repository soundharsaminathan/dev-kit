import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@dev-ui/components/dialog";
import { Modal } from "@dev-ui/components/modal";
import { useIsMobile } from "@dev-ui/hooks";
import type { ReactNode } from "react";
import { AppBottomSheet } from "./app-bottom-sheet";
import styles from "./app-sheet.module.scss";

export type AppSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | undefined;
  size?: "default" | "tall" | "wide" | undefined;
  children: ReactNode;
};

export function AppSheet({
  isOpen,
  onOpenChange,
  title,
  size = "default",
  children,
}: AppSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <AppBottomSheet
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title={title}
        size={size === "wide" ? "tall" : size}
      >
        {children}
      </AppBottomSheet>
    );
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal
        className={styles.modal}
        data-size={size === "wide" ? "wide" : undefined}
      >
        <DialogContent showCloseButton className={styles.content}>
          {title ? (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
          ) : null}
          <DialogBody
            className={styles.body}
            data-size={size === "tall" || size === "wide" ? "tall" : undefined}
          >
            {children}
          </DialogBody>
        </DialogContent>
      </Modal>
    </Dialog>
  );
}
