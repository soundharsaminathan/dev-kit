import { useCanHover } from "@dev-ui/hooks";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./tooltip-icon-bar.module.scss";

const VIEWPORT_PADDING = 8;

type TooltipCoords = {
  clipPath: string;
  translateX: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type PortalBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type RegisteredItem = {
  id: string;
  label: string;
  anchorRef: RefObject<HTMLSpanElement | null>;
};

type TooltipIconBarContextValue = {
  delay: number;
  canHover: boolean;
  register: (item: RegisteredItem) => number;
  unregister: (id: string) => void;
  onItemEnter: (index: number) => void;
};

const TooltipIconBarContext = createContext<TooltipIconBarContextValue | null>(
  null,
);

type TooltipIconBarProps = {
  children: ReactNode;
  placement?: "top" | "bottom";
  delay?: number;
  className?: string;
  itemsClassName?: string;
  portal?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
};

type TooltipIconBarItemProps = {
  label: string;
  className?: string;
  children: ReactElement;
};

export function TooltipIconBarItem({
  label,
  className,
  children,
}: TooltipIconBarItemProps) {
  const context = useContext(TooltipIconBarContext);
  const itemId = useId();
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const indexRef = useRef(-1);
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!context) {
      return;
    }

    indexRef.current = context.register({
      id: itemId,
      label,
      anchorRef,
    });

    return () => context.unregister(itemId);
  }, [context, itemId, label]);

  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  function handleTouchStart() {
    if (!context || context.canHover || indexRef.current < 0) {
      return;
    }
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    touchTimeoutRef.current = setTimeout(() => {
      context.onItemEnter(indexRef.current);
    }, context.delay);
  }

  function handleTouchEnd() {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  }

  const anchorClassName = [styles.itemAnchor, className]
    .filter(Boolean)
    .join(" ");

  if (!context) {
    return <span className={anchorClassName}>{children}</span>;
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper for tooltip trigger, handlers are for tooltip display
    <span
      className={anchorClassName}
      ref={anchorRef}
      role="presentation"
      onMouseEnter={() => context.onItemEnter(indexRef.current)}
      onFocus={() => context.onItemEnter(indexRef.current)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </span>
  );
}

TooltipIconBarItem.displayName = "TooltipIconBarItem";

export function TooltipIconBar({
  children,
  placement = "top",
  delay = 300,
  className,
  itemsClassName,
  portal = false,
  disabled = false,
  "aria-label": ariaLabel,
}: TooltipIconBarProps) {
  const canHover = useCanHover();
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<RegisteredItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [coords, setCoords] = useState<TooltipCoords>({
    clipPath: "",
    translateX: 0,
  });
  const [isEntering, setIsEntering] = useState(true);
  const [portalBox, setPortalBox] = useState<PortalBox | null>(null);

  const measureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef<RegisteredItem[]>([]);
  const activeIndexRef = useRef<number | null>(null);

  activeIndexRef.current = activeIndex;

  const register = useCallback((item: RegisteredItem) => {
    const existingIndex = itemsRef.current.findIndex(
      (entry) => entry.id === item.id,
    );
    if (existingIndex >= 0) {
      const previous = itemsRef.current[existingIndex];
      itemsRef.current[existingIndex] = item;
      if (previous?.label !== item.label) {
        setItems([...itemsRef.current]);
      }
      return existingIndex;
    }

    itemsRef.current = [...itemsRef.current, item];
    setItems([...itemsRef.current]);
    return itemsRef.current.length - 1;
  }, []);

  const unregister = useCallback((id: string) => {
    itemsRef.current = itemsRef.current.filter((entry) => entry.id !== id);
    setItems(itemsRef.current);
  }, []);

  const labels = items.map((item) => item.label);

  const calculatePosition = useCallback(
    (index: number): TooltipCoords | null => {
      const root = rootRef.current;
      const activeLabel = measureRefs.current[index];
      const activeAnchor = itemsRef.current[index]?.anchorRef.current;

      if (!root || !activeLabel || !activeAnchor) {
        return null;
      }

      const rootRect = root.getBoundingClientRect();
      const labelRect = activeLabel.getBoundingClientRect();
      const anchorRect = activeAnchor.getBoundingClientRect();

      const labelLeft = labelRect.left - rootRect.left;
      const labelWidth = labelRect.width;
      const labelCenter = labelLeft + labelWidth / 2;
      const anchorCenter =
        anchorRect.left - rootRect.left + anchorRect.width / 2;

      const totalWidth = measureRefs.current.reduce(
        (acc, element) => acc + (element?.getBoundingClientRect().width ?? 0),
        0,
      );

      if (totalWidth <= 0 || labelWidth <= 0) {
        return null;
      }

      const clipLeft = (labelLeft / totalWidth) * 100;
      const clipRight = 100 - ((labelLeft + labelWidth) / totalWidth) * 100;
      const preferredTranslateX = anchorCenter - labelCenter;
      const viewportLeft = VIEWPORT_PADDING - rootRect.left - labelLeft;
      const viewportRight =
        window.innerWidth -
        VIEWPORT_PADDING -
        rootRect.left -
        labelLeft -
        labelWidth;
      const minTranslateX = Math.min(viewportLeft, viewportRight);
      const maxTranslateX = Math.max(viewportLeft, viewportRight);

      return {
        clipPath: `inset(0 ${clipRight}% 0 ${clipLeft}% round var(--radius-md, 0.5rem))`,
        translateX: clamp(preferredTranslateX, minTranslateX, maxTranslateX),
      };
    },
    [],
  );

  const applyPortalBox = useCallback(() => {
    if (!portal || !rootRef.current) {
      return;
    }

    const rect = rootRef.current.getBoundingClientRect();
    const nextBox: PortalBox = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    setPortalBox((current) => {
      if (
        current &&
        current.left === nextBox.left &&
        current.top === nextBox.top &&
        current.width === nextBox.width &&
        current.height === nextBox.height
      ) {
        return current;
      }
      return nextBox;
    });
  }, [portal]);

  const applyCoords = useCallback((nextCoords: TooltipCoords) => {
    setCoords((current) => {
      if (
        current.clipPath === nextCoords.clipPath &&
        current.translateX === nextCoords.translateX
      ) {
        return current;
      }
      return nextCoords;
    });
  }, []);

  const revealTooltip = useCallback(
    (index: number) => {
      const nextCoords = calculatePosition(index);
      if (!nextCoords) {
        requestAnimationFrame(() => {
          const retryCoords = calculatePosition(index);
          if (!retryCoords) {
            return;
          }
          applyPortalBox();
          applyCoords(retryCoords);
          setActiveIndex(index);
        });
        return;
      }
      applyPortalBox();
      applyCoords(nextCoords);
      setActiveIndex(index);
    },
    [applyCoords, applyPortalBox, calculatePosition],
  );

  const showTooltip = useCallback(
    (index: number, immediate = false) => {
      if (index < 0 || index >= itemsRef.current.length) {
        return;
      }

      if (activeIndexRef.current === null && !immediate) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setIsEntering(true);
        timeoutRef.current = setTimeout(() => revealTooltip(index), delay);
        return;
      }

      setIsEntering(activeIndexRef.current === null);
      revealTooltip(index);
    },
    [delay, revealTooltip],
  );

  function hideTooltip() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveIndex(null);
    setCoords({ clipPath: "", translateX: 0 });
    setIsEntering(true);
    setPortalBox(null);
  }

  const handleItemEnter = useCallback(
    (index: number) => {
      if (index < 0) {
        return;
      }
      showTooltip(index, !canHover);
    },
    [canHover, showTooltip],
  );

  const contextValue = useMemo(
    () => ({
      delay,
      canHover,
      register,
      unregister,
      onItemEnter: handleItemEnter,
    }),
    [canHover, delay, handleItemEnter, register, unregister],
  );

  const tooltipVisible = activeIndex !== null && coords.clipPath.length > 0;
  const activeLabel = activeIndex !== null ? labels[activeIndex] : undefined;

  useLayoutEffect(() => {
    if (!portal || activeIndex === null) {
      return;
    }

    function handlePositionChange() {
      applyPortalBox();
      if (activeIndexRef.current !== null) {
        const nextCoords = calculatePosition(activeIndexRef.current);
        if (nextCoords) {
          applyCoords(nextCoords);
        }
      }
    }

    window.addEventListener("scroll", handlePositionChange, true);
    window.addEventListener("resize", handlePositionChange);

    return () => {
      window.removeEventListener("scroll", handlePositionChange, true);
      window.removeEventListener("resize", handlePositionChange);
    };
  }, [portal, activeIndex, applyCoords, applyPortalBox, calculatePosition]);

  if (disabled) {
    const rootProps = ariaLabel
      ? { role: "navigation" as const, "aria-label": ariaLabel }
      : {};

    return (
      <div
        className={[styles.root, className].filter(Boolean).join(" ")}
        {...rootProps}
      >
        <div
          className={[styles.items, itemsClassName].filter(Boolean).join(" ")}
        >
          {children}
        </div>
      </div>
    );
  }

  const tooltipLayerClassName = [
    styles.tooltipLayer,
    portal ? styles.tooltipLayerPortal : "",
    placement === "top" ? styles.tooltipTop : styles.tooltipBottom,
    portal && placement === "top" ? styles.tooltipTopPortal : "",
    portal && placement === "bottom" ? styles.tooltipBottomPortal : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tooltipContent = (
    <motion.div
      className={styles.tooltipPanel}
      role="tooltip"
      animate={
        reducedMotion
          ? { opacity: 1 }
          : {
              clipPath: coords.clipPath,
              x: coords.translateX,
            }
      }
      transition={
        reducedMotion
          ? { duration: 0.12 }
          : {
              type: "spring",
              bounce: 0,
              duration: isEntering ? 0 : 0.4,
            }
      }
      onUpdate={() => {
        setIsEntering((current) => (current ? false : current));
      }}
    >
      <div className={styles.labelStrip} aria-hidden={!activeLabel}>
        {items.map((item) => (
          <div key={item.id} className={styles.labelSegment}>
            {item.label}
          </div>
        ))}
      </div>
    </motion.div>
  );

  const tooltipLayer = (
    <AnimatePresence>
      {tooltipVisible ? (
        portal && portalBox ? (
          <div
            className={tooltipLayerClassName}
            style={{
              position: "fixed",
              left: portalBox.left,
              width: portalBox.width,
              top:
                placement === "top"
                  ? portalBox.top
                  : portalBox.top + portalBox.height,
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.12 : 0.2 }}
            >
              {tooltipContent}
            </motion.div>
          </div>
        ) : (
          <motion.div
            className={tooltipLayerClassName}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.2 }}
          >
            {tooltipContent}
          </motion.div>
        )
      ) : null}
    </AnimatePresence>
  );

  const rootProps = ariaLabel
    ? { role: "navigation" as const, "aria-label": ariaLabel }
    : { role: "group" as const };

  return (
    <TooltipIconBarContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: container for icon bar with tooltip display logic */}
      <div
        ref={rootRef}
        className={[styles.root, className].filter(Boolean).join(" ")}
        {...rootProps}
        onMouseLeave={hideTooltip}
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node)) {
            hideTooltip();
          }
        }}
      >
        {portal && typeof document !== "undefined"
          ? createPortal(tooltipLayer, document.body)
          : tooltipLayer}

        <div
          className={[styles.items, itemsClassName].filter(Boolean).join(" ")}
        >
          {children}
        </div>

        <div className={styles.measure} aria-hidden>
          {items.map((item, index) => (
            <div
              key={`measure-${item.id}`}
              ref={(element) => {
                measureRefs.current[index] = element;
              }}
              className={styles.labelSegment}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </TooltipIconBarContext.Provider>
  );
}
