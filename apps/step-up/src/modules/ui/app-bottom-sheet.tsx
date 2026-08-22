import {
  Drawer,
  DrawerHandle,
  type DrawerSizing,
} from "@dev-ui/components/drawer";
import type { ReactNode } from "react";
import styles from "./app-bottom-sheet.module.scss";

type AppBottomSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | undefined;
  size?: "default" | "tall" | undefined;
  sizing?: DrawerSizing | undefined;
  children: ReactNode;
};

export function AppBottomSheet({
  isOpen,
  onOpenChange,
  title,
  size = "default",
  sizing = "static",
  children,
}: AppBottomSheetProps) {
  return (
    <Drawer
      placement="bottom"
      sizing={sizing}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className={styles.panel ?? ""}
    >
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
