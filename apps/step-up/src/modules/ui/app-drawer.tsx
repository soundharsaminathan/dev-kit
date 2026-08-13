import { Drawer } from "@dev-ui/components/drawer";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import type { ReactNode } from "react";
import styles from "./app-drawer.module.scss";

export type AppDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | undefined;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
};

export function AppDrawer({
  isOpen,
  onOpenChange,
  title,
  toolbar,
  footer,
  children,
  className,
}: AppDrawerProps) {
  const isMobile = useIsMobile();
  const panelClassName = [
    styles.panel,
    isMobile ? styles.panelFullscreen : styles.panelSide,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Drawer
      placement="right"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className={panelClassName}
    >
      <div className={styles.shell}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title ?? "Details"}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" />
          </button>
        </div>
        {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}
        <div className={styles.body}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </Drawer>
  );
}
