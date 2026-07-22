import { Drawer, DrawerHandle } from "@dev-ui/components/drawer";
import type { ReactNode } from "react";
import styles from "./app-bottom-sheet.module.scss";

type AppBottomSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | undefined;
  children: ReactNode;
};

export function AppBottomSheet({
  isOpen,
  onOpenChange,
  title,
  children,
}: AppBottomSheetProps) {
  return (
    <Drawer placement="bottom" isOpen={isOpen} onOpenChange={onOpenChange}>
      <DrawerHandle />
      <div className={styles.body}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children}
      </div>
    </Drawer>
  );
}
