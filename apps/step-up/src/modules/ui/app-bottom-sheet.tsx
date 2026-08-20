import { Drawer, DrawerHandle } from "@dev-ui/components/drawer";
import type { ReactNode } from "react";
import styles from "./app-bottom-sheet.module.scss";

type AppBottomSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | undefined;
  size?: "default" | "tall" | undefined;
  children: ReactNode;
};

export function AppBottomSheet({
  isOpen,
  onOpenChange,
  title,
  size = "default",
  children,
}: AppBottomSheetProps) {
  return (
    <Drawer placement="bottom" isOpen={isOpen} onOpenChange={onOpenChange}>
      <DrawerHandle />
      <div
        className={styles.body}
        data-size={size === "tall" ? "tall" : undefined}
      >
        {title ? <p className={styles.title}>{title}</p> : null}
        {children}
      </div>
    </Drawer>
  );
}
