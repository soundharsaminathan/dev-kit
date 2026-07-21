import { useCanHover } from "@dev-ui/hooks";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./elastic-avatar-stack.module.scss";

export type ElasticAvatarStackItem = {
  id: string;
  name: string;
  image?: string | null | undefined;
};

export type ElasticAvatarStackProps = {
  items: ElasticAvatarStackItem[];
  itemSize?: number | undefined;
  overlap?: number | undefined;
  pushForce?: number | undefined;
  maxItems?: number | undefined;
  className?: string | undefined;
};

const TOOLTIP_SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

export function ElasticAvatarStack({
  items,
  itemSize = 28,
  overlap = 10,
  pushForce = 8,
  maxItems = 5,
  className,
}: ElasticAvatarStackProps) {
  const canHover = useCanHover();
  const reducedMotion = useReducedMotion();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const [activeName, setActiveName] = useState("");
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const visibleItems = items.slice(0, maxItems);
  const total = visibleItems.length;

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  if (total === 0) {
    return null;
  }

  function clearLeaveTimeout() {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  }

  function handleItemEnter(index: number) {
    if (!canHover) return;
    clearLeaveTimeout();

    const item = itemRefs.current[index];
    if (item) {
      setTooltipPos({
        left: item.offsetLeft + item.offsetWidth / 2,
        top: item.offsetTop,
      });
      setActiveName(visibleItems[index]?.name ?? "");
      setHoveredIndex(index);
    }
  }

  function handleRootLeave() {
    clearLeaveTimeout();
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(null);
    }, 150);
  }

  function itemStyle(index: number): CSSProperties {
    let translateX = 0;
    let scale = 1;
    let zIndex = index;

    if (canHover && hoveredIndex !== null && !reducedMotion) {
      if (index > hoveredIndex) {
        translateX = Math.min(pushForce * (index - hoveredIndex), overlap);
      } else if (index < hoveredIndex) {
        translateX = -Math.min(pushForce * (hoveredIndex - index), overlap);
      } else {
        scale = 1.2;
        zIndex = 100;
      }
    } else if (canHover && hoveredIndex === index) {
      zIndex = 100;
    }

    return {
      width: itemSize,
      height: itemSize,
      marginLeft: index === 0 ? 0 : -overlap,
      zIndex,
      ["--elastic-x" as string]: `${translateX}px`,
      ["--elastic-scale" as string]: String(scale),
    };
  }

  const rootClassName = [styles.root, className].filter(Boolean).join(" ");
  const label = visibleItems.map((item) => item.name).join(", ");

  return (
    <fieldset
      className={rootClassName}
      aria-label={label}
      onMouseLeave={handleRootLeave}
      style={
        {
          "--elastic-avatar-size": `${itemSize}px`,
        } as CSSProperties
      }
    >
      <AnimatePresence>
        {canHover && hoveredIndex !== null ? (
          <motion.div
            className={styles.tooltip}
            role="tooltip"
            initial={
              reducedMotion
                ? { opacity: 0, x: "-50%", y: "-100%" }
                : {
                    opacity: 0,
                    x: "-50%",
                    y: "-80%",
                    scale: 0.95,
                    left: tooltipPos.left,
                    top: tooltipPos.top - 10,
                  }
            }
            animate={
              reducedMotion
                ? {
                    opacity: 1,
                    x: "-50%",
                    y: "-100%",
                    left: tooltipPos.left,
                    top: tooltipPos.top - 10,
                  }
                : {
                    opacity: 1,
                    x: "-50%",
                    y: "-100%",
                    scale: 1,
                    left: tooltipPos.left,
                    top: tooltipPos.top - 10,
                  }
            }
            exit={
              reducedMotion
                ? { opacity: 0, x: "-50%", y: "-100%" }
                : {
                    opacity: 0,
                    x: "-50%",
                    y: "-80%",
                    scale: 0.95,
                  }
            }
            transition={reducedMotion ? { duration: 0.15 } : TOOLTIP_SPRING}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={activeName}
                className={styles.tooltipLabel}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {activeName || " "}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {visibleItems.map((item, index) => {
        const isActive = hoveredIndex === index;
        return (
          <div
            key={item.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role="img"
            aria-label={item.name}
            className={styles.item}
            data-active={isActive ? "" : undefined}
            style={itemStyle(index)}
            onMouseEnter={() => handleItemEnter(index)}
          >
            {item.image ? (
              <img
                src={item.image}
                alt=""
                className={styles.image}
                loading="lazy"
                draggable={false}
              />
            ) : (
              <span className={styles.fallback} aria-hidden>
                {item.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
