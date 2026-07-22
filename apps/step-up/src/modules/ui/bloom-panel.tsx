import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AppBottomSheet } from "./app-bottom-sheet";
import styles from "./bloom-panel.module.scss";

export type BloomPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const SPRING_FOLDER = {
  type: "spring" as const,
  stiffness: 300,
  damping: 32,
  mass: 0.9,
};

export function BloomPanel({
  isOpen,
  onOpenChange,
  title,
  children,
  className,
}: BloomPanelProps) {
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();
  const layoutId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || isMobile) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    function onPointer(event: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [isOpen, isMobile, onOpenChange]);

  if (isMobile) {
    return (
      <AppBottomSheet isOpen={isOpen} onOpenChange={onOpenChange} title={title}>
        {children}
      </AppBottomSheet>
    );
  }

  const morph = reduce ? { duration: 0.15 } : SPRING_FOLDER;
  const panelClassName = [styles.panel, className].filter(Boolean).join(" ");

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className={styles.overlay} role="presentation">
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.12 : 0.2 }}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            layoutId={layoutId}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Details"}
            className={panelClassName}
            style={{ borderRadius: 16 }}
            initial={
              reduce
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: 0.92,
                    clipPath: "inset(40% 28% 40% 28%)",
                  }
            }
            animate={{
              opacity: 1,
              scale: 1,
              clipPath: "inset(0% 0% 0% 0%)",
            }}
            exit={
              reduce
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: 0.96,
                    clipPath: "inset(36% 24% 36% 24%)",
                  }
            }
            transition={{
              ...morph,
              clipPath: {
                type: "tween",
                duration: reduce ? 0.15 : 0.45,
                ease: EASE_OUT,
              },
            }}
          >
            <div className={styles.header}>
              <span className={styles.headerTitle}>{title}</span>
              <button
                type="button"
                className={styles.close}
                aria-label="Close"
                onClick={() => onOpenChange(false)}
              >
                <Icon name="x" />
              </button>
            </div>
            <motion.div
              className={styles.body}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.12, duration: 0.2 }}
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
