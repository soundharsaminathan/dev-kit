import { Icon, type IconName } from "@dev-ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./bloom-menu.module.scss";

export type BloomMenuItem = {
  id: string;
  label: string;
  icon: IconName;
};

export type BloomMenuProps = {
  items: BloomMenuItem[];
  onSelect?: (id: string) => void;
  triggerLabel?: string;
  panelTitle?: string;
  className?: string;
  columns?: 1 | 2 | 3;
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const SPRING_FOLDER = {
  type: "spring" as const,
  stiffness: 300,
  damping: 32,
  mass: 0.9,
};

const SPRING_ITEM = {
  type: "spring" as const,
  stiffness: 440,
  damping: 34,
};

function resolveColumns(itemsLength: number, columns?: 1 | 2 | 3): 1 | 2 | 3 {
  if (columns) return columns;
  if (itemsLength <= 1) return 1;
  if (itemsLength === 2) return 2;
  return 3;
}

export function BloomMenu({
  items,
  onSelect,
  triggerLabel = "Create",
  panelTitle = "Create",
  className,
  columns,
}: BloomMenuProps) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const layoutId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const cols = resolveColumns(items.length, columns);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointer(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const morph = reduce ? { duration: 0.15 } : SPRING_FOLDER;
  const rootClassName = [styles.root, className].filter(Boolean).join(" ");
  const rows = Math.ceil(items.length / cols);

  return (
    <div ref={ref} className={rootClassName}>
      <div className={styles.spacer} aria-hidden>
        {triggerLabel}
        <Icon name="plus" />
      </div>

      <div className={styles.stage}>
        <AnimatePresence initial={false} mode="popLayout">
          {open ? (
            <motion.div
              key="panel"
              layoutId={layoutId}
              transition={morph}
              style={{ borderRadius: 16 }}
              className={styles.panel}
            >
              <motion.div
                layout
                className={styles.panelInner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : 0.12, duration: 0.2 }}
              >
                <div className={styles.header}>
                  <span className={styles.headerTitle}>{panelTitle}</span>
                  <button
                    type="button"
                    className={styles.close}
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                  >
                    <Icon name="x" />
                  </button>
                </div>

                <motion.div
                  className={styles.grid}
                  data-cols={cols}
                  initial={
                    reduce ? false : { clipPath: "inset(40% 28% 40% 28%)" }
                  }
                  animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                  transition={{
                    delay: reduce ? 0 : 0.08,
                    duration: 0.45,
                    ease: EASE_OUT,
                  }}
                >
                  {items.map((item, index) => {
                    const col = index % cols;
                    const row = Math.floor(index / cols);
                    const dist = Math.hypot(
                      col - (cols - 1) / 2,
                      row - (rows - 1) / 2,
                    );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.item}
                        data-border-end={col < cols - 1 ? "true" : undefined}
                        data-border-bottom={row < rows - 1 ? "true" : undefined}
                        onClick={() => {
                          onSelect?.(item.id);
                          setOpen(false);
                        }}
                      >
                        <motion.span
                          className={styles.itemContent}
                          initial={
                            reduce
                              ? { opacity: 0 }
                              : {
                                  opacity: 0,
                                  scale: 0.85,
                                  filter: "blur(6px)",
                                }
                          }
                          animate={{
                            opacity: 1,
                            scale: 1,
                            filter: "blur(0px)",
                          }}
                          transition={{
                            delay: reduce ? 0 : 0.1 + dist * 0.07,
                            ...SPRING_ITEM,
                          }}
                        >
                          <span className={styles.itemIcon}>
                            <Icon name={item.icon} />
                          </span>
                          <span className={styles.itemLabel}>{item.label}</span>
                        </motion.span>
                      </button>
                    );
                  })}
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.button
              key="trigger"
              type="button"
              layoutId={layoutId}
              transition={morph}
              style={{ borderRadius: 16 }}
              className={styles.trigger}
              aria-haspopup="menu"
              aria-expanded={open}
              {...(reduce ? {} : { whileTap: { scale: 0.97 } })}
              onClick={() => setOpen(true)}
            >
              <motion.span layout className={styles.triggerLabel}>
                {triggerLabel}
                <Icon name="plus" />
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
