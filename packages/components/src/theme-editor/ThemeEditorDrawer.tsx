import { cn } from "@dev-ui/core";
import { useCallback, useState } from "react";
import { Button } from "../button/Button";
import { Drawer, DrawerHandle } from "../drawer/Drawer";
import { ThemeEditorPanel } from "./ThemeEditorPanel";
import styles from "./theme-editor.module.scss";
import type { ThemeEditorDrawerProps } from "./theme-editor.types";
import { useThemeEditorLivePreviewEffect } from "./use-theme-editor-live-preview";

function ThemeEditorDrawer({
  value,
  onChange,
  isOpen,
  defaultOpen,
  onOpenChange,
  onSave,
  onLivePreview,
  trigger,
  triggerLabel = "Edit theme",
  panelHeader,
  children,
  className,
}: ThemeEditorDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const open = isOpen ?? internalOpen;

  useThemeEditorLivePreviewEffect(value, open, onLivePreview);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isOpen === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isOpen, onOpenChange],
  );

  const handleSave = useCallback(() => {
    onSave?.(value);
  }, [onSave, value]);

  return (
    <>
      {trigger === undefined ? (
        <Button variant="default" onClick={() => handleOpenChange(true)}>
          {triggerLabel}
        </Button>
      ) : (
        trigger
      )}

      <Drawer
        isOpen={open}
        onOpenChange={handleOpenChange}
        placement="right"
        swipeToDismiss
        {...(styles.drawerPopup ? { className: styles.drawerPopup } : {})}
      >
        <DrawerHandle />
        <div className={cn(styles.drawer, className)}>
          <header className={styles.drawerHeader}>
            <div>
              <h2 className={styles.drawerTitle}>Theme editor</h2>
              <p className={styles.drawerDescription}>
                Changes apply live across the app while this drawer is open.
              </p>
            </div>
            <Button
              variant="quiet"
              size="sm"
              aria-label="Close theme editor"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </header>

          <div className={styles.drawerBody}>
            {panelHeader ? (
              <div className={styles.panelHeader}>{panelHeader}</div>
            ) : null}
            <ThemeEditorPanel value={value} onChange={onChange} />
          </div>

          <footer className={styles.drawerFooter}>
            <div className={styles.drawerActions}>
              <Button variant="primary" onClick={handleSave}>
                Save theme
              </Button>
              <Button variant="default" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </div>
            {children}
          </footer>
        </div>
      </Drawer>
    </>
  );
}

export { ThemeEditorDrawer };
