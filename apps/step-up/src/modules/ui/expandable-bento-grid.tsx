import { Icon } from "@dev-ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import styles from "./expandable-bento-grid.module.scss";

export type ExpandableBentoItem = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  media?: ReactNode;
  content?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export type ExpandableBentoGridProps = {
  items: ExpandableBentoItem[];
  className?: string;
  "aria-label"?: string;
};

const PANEL_SPRING = {
  type: "spring" as const,
  stiffness: 360,
  damping: 32,
  mass: 0.6,
};

export function ExpandableBentoGrid({
  items,
  className,
  "aria-label": ariaLabel = "Items",
}: ExpandableBentoGridProps) {
  const layoutId = useId();
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const active = items.find((item) => item.id === activeId) ?? null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveId(null);
      }
    }

    if (active) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setActiveId(null);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [active]);

  const rootClassName = [styles.root, className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName}>
      <ul className={styles.grid} aria-label={ariaLabel}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <motion.button
                type="button"
                layoutId={`card-${item.id}-${layoutId}`}
                className={[styles.card, item.className]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setActiveId(item.id)}
                transition={reducedMotion ? { duration: 0.2 } : PANEL_SPRING}
                style={{
                  opacity: isActive ? 0 : 1,
                  pointerEvents: isActive ? "none" : undefined,
                }}
              >
                <motion.div
                  layoutId={`media-${item.id}-${layoutId}`}
                  className={styles.media}
                  transition={reducedMotion ? { duration: 0.2 } : PANEL_SPRING}
                >
                  {item.media}
                </motion.div>
                <div className={styles.copy}>
                  <motion.h3
                    layoutId={`title-${item.id}-${layoutId}`}
                    className={styles.title}
                    transition={
                      reducedMotion ? { duration: 0.2 } : PANEL_SPRING
                    }
                  >
                    {item.title}
                  </motion.h3>
                  {item.subtitle ? (
                    <motion.p
                      layoutId={`subtitle-${item.id}-${layoutId}`}
                      className={styles.subtitle}
                      transition={
                        reducedMotion ? { duration: 0.2 } : PANEL_SPRING
                      }
                    >
                      {item.subtitle}
                    </motion.p>
                  ) : null}
                </div>
              </motion.button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {active ? (
          <div className={styles.overlay} role="presentation">
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.12 : 0.2 }}
              aria-hidden
            />
            <motion.button
              type="button"
              className={styles.close}
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              onClick={() => setActiveId(null)}
            >
              <Icon name="x" />
            </motion.button>
            <motion.div
              ref={panelRef}
              layoutId={`card-${active.id}-${layoutId}`}
              className={styles.panel}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`bento-title-${active.id}-${layoutId}`}
              transition={reducedMotion ? { duration: 0.2 } : PANEL_SPRING}
            >
              <motion.div
                layoutId={`media-${active.id}-${layoutId}`}
                className={styles.panelMedia}
                transition={reducedMotion ? { duration: 0.2 } : PANEL_SPRING}
              >
                {active.media}
              </motion.div>
              <div className={styles.panelHeader}>
                <div className={styles.panelCopy}>
                  <motion.h3
                    layoutId={`title-${active.id}-${layoutId}`}
                    id={`bento-title-${active.id}-${layoutId}`}
                    className={styles.panelTitle}
                    transition={
                      reducedMotion ? { duration: 0.2 } : PANEL_SPRING
                    }
                  >
                    {active.title}
                  </motion.h3>
                  {active.description || active.subtitle ? (
                    <motion.p
                      layoutId={`subtitle-${active.id}-${layoutId}`}
                      className={styles.panelDescription}
                      transition={
                        reducedMotion ? { duration: 0.2 } : PANEL_SPRING
                      }
                    >
                      {active.description ?? active.subtitle}
                    </motion.p>
                  ) : null}
                </div>
                {active.actionLabel && active.onAction ? (
                  <motion.button
                    type="button"
                    layoutId={`action-${active.id}-${layoutId}`}
                    className={styles.action}
                    onClick={active.onAction}
                    transition={
                      reducedMotion ? { duration: 0.2 } : PANEL_SPRING
                    }
                  >
                    {active.actionLabel}
                  </motion.button>
                ) : null}
              </div>
              {active.content ? (
                <motion.div
                  className={styles.panelBody}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0.12 : 0.2 }}
                >
                  {active.content}
                </motion.div>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
