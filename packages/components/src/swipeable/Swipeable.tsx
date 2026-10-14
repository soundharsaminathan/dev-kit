import { cn } from "@dev-ui/core";
import {
  useInteractOutside,
  useKeyboard,
  useMove,
} from "@react-aria/interactions";
import { mergeProps } from "@react-aria/utils";
import {
  type CSSProperties,
  type HTMLAttributes,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./swipeable.module.scss";
import type { SwipeableProps, SwipeableRevealSide } from "./swipeable.types";

const DEFAULT_THRESHOLD = 80;
const DEFAULT_MIN_SNAP_OPEN = 24;

const SWIPE_IGNORE_SELECTOR =
  "input, textarea, select, option, button, a, label, [contenteditable]:not([contenteditable='false']), [data-input], [role='textbox'], [role='searchbox'], [role='combobox'], [role='spinbutton']";

const ACTION_FOCUS_SELECTOR =
  "button, [href], input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1'])";

function shouldIgnoreSwipeStart(target: EventTarget | null) {
  return (
    target instanceof Element && Boolean(target.closest(SWIPE_IGNORE_SELECTOR))
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function allowInteractiveSwipeProps(
  moveProps: HTMLAttributes<HTMLElement>,
  onRevealedTap: () => void,
  isRevealed: boolean,
): HTMLAttributes<HTMLElement> {
  const { onPointerDown, ...rest } = moveProps;
  if (!onPointerDown) {
    return rest;
  }

  return {
    ...rest,
    onPointerDown: (event) => {
      if (shouldIgnoreSwipeStart(event.target)) {
        return;
      }
      if (isRevealed) {
        onRevealedTap();
        return;
      }
      onPointerDown(event);
    },
  };
}

function useRevealExtent(
  leftRef: RefObject<HTMLDivElement | null>,
  rightRef: RefObject<HTMLDivElement | null>,
  horizontal: boolean,
) {
  const [extent, setExtent] = useState({ left: 0, right: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      setExtent({
        left: horizontal
          ? (leftRef.current?.offsetWidth ?? 0)
          : (leftRef.current?.offsetHeight ?? 0),
        right: horizontal
          ? (rightRef.current?.offsetWidth ?? 0)
          : (rightRef.current?.offsetHeight ?? 0),
      });
    };

    measure();

    const left = leftRef.current;
    const right = rightRef.current;
    const observer = new ResizeObserver(measure);
    if (left) {
      observer.observe(left);
    }
    if (right) {
      observer.observe(right);
    }
    return () => observer.disconnect();
  }, [horizontal, leftRef, rightRef]);

  return extent;
}

export function Swipeable({
  direction = "horizontal",
  threshold = DEFAULT_THRESHOLD,
  minSnapOpen = DEFAULT_MIN_SNAP_OPEN,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  leftActions,
  rightActions,
  fallbackActions,
  onRevealChange,
  ariaLabel = "Swipe actions",
  className,
  style,
  children,
}: SwipeableProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const leftActionsRef = useRef<HTMLDivElement>(null);
  const rightActionsRef = useRef<HTMLDivElement>(null);
  const deltaRef = useRef({ x: 0, y: 0 });
  const [revealedSide, setRevealedSide] = useState<SwipeableRevealSide>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const horizontal = direction === "horizontal";
  const extent = useRevealExtent(leftActionsRef, rightActionsRef, horizontal);

  const hasLeftActions = Boolean(leftActions);
  const hasRightActions = Boolean(rightActions);
  const swipeEnabled = horizontal
    ? Boolean(onSwipeLeft || onSwipeRight || hasLeftActions || hasRightActions)
    : Boolean(onSwipeUp || onSwipeDown);

  const closeReveal = useCallback(() => {
    setDragOffset(0);
    setRevealedSide((previous) => (previous === null ? previous : null));
  }, []);

  const openReveal = useCallback(
    (side: "left" | "right") => {
      const width = side === "left" ? extent.left : extent.right;
      setRevealedSide(side);
      setDragOffset(horizontal ? (side === "left" ? width : -width) : 0);
    },
    [extent, horizontal],
  );

  useLayoutEffect(() => {
    onRevealChange?.(revealedSide);
  }, [onRevealChange, revealedSide]);

  const focusFirstAction = useCallback((side: "left" | "right") => {
    const panel =
      side === "left" ? leftActionsRef.current : rightActionsRef.current;
    const target = panel?.querySelector<HTMLElement>(ACTION_FOCUS_SELECTOR);
    target?.focus();
  }, []);

  const hasActionsFor = useCallback(
    (side: "left" | "right") =>
      side === "left" ? hasLeftActions : hasRightActions,
    [hasLeftActions, hasRightActions],
  );

  const runSwipe = useCallback(
    (negative: boolean, fromKeyboard: boolean) => {
      if (horizontal) {
        const callback = negative ? onSwipeLeft : onSwipeRight;
        const side: "left" | "right" = negative ? "right" : "left";
        if (callback) {
          callback();
          closeReveal();
          return;
        }
        if (hasActionsFor(side)) {
          openReveal(side);
          if (fromKeyboard) {
            window.setTimeout(() => focusFirstAction(side), 0);
          }
          return;
        }
        closeReveal();
        return;
      }

      const callback = negative ? onSwipeUp : onSwipeDown;
      if (callback) {
        callback();
      }
      closeReveal();
    },
    [
      horizontal,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      hasActionsFor,
      openReveal,
      closeReveal,
      focusFirstAction,
    ],
  );

  const resolveGesture = useCallback(
    (deltaX: number, deltaY: number, fromKeyboard: boolean) => {
      const delta = horizontal ? deltaX : deltaY;
      const abs = Math.abs(delta);
      const negative = delta < 0;

      if (fromKeyboard) {
        runSwipe(negative, true);
        return;
      }
      if (abs >= threshold) {
        runSwipe(negative, false);
        return;
      }
      if (abs >= minSnapOpen) {
        const side: "left" | "right" = negative ? "right" : "left";
        if (hasActionsFor(side)) {
          openReveal(side);
          return;
        }
      }
      closeReveal();
    },
    [
      horizontal,
      threshold,
      minSnapOpen,
      runSwipe,
      hasActionsFor,
      openReveal,
      closeReveal,
    ],
  );

  const { moveProps } = useMove({
    onMoveStart() {
      deltaRef.current = { x: 0, y: 0 };
      setDragging(true);
    },
    onMove({ deltaX, deltaY }) {
      deltaRef.current.x += deltaX;
      deltaRef.current.y += deltaY;
      const cumulative = horizontal ? deltaRef.current.x : deltaRef.current.y;
      const offset = horizontal
        ? clamp(cumulative, -extent.right, extent.left)
        : cumulative;
      setDragOffset(offset);
    },
    onMoveEnd({ pointerType }) {
      const fromKeyboard = pointerType === "keyboard";
      setDragging(false);
      resolveGesture(deltaRef.current.x, deltaRef.current.y, fromKeyboard);
      deltaRef.current = { x: 0, y: 0 };
    },
  });

  const { keyboardProps } = useKeyboard({
    onKeyDown: (event) => {
      if (event.key === "Escape") {
        closeReveal();
      }
    },
  });

  useInteractOutside({
    ref: rootRef,
    isDisabled: revealedSide === null,
    onInteractOutside: () => {
      closeReveal();
    },
  });

  const surfaceProps = {
    role: "group",
    "aria-label": ariaLabel,
    ...(swipeEnabled
      ? {
          ...mergeProps(
            allowInteractiveSwipeProps(
              moveProps,
              closeReveal,
              revealedSide !== null,
            ),
            keyboardProps,
          ),
          tabIndex: 0,
          "aria-keyshortcuts": horizontal ? "ArrowLeft ArrowRight" : undefined,
        }
      : {}),
  };

  const surfaceStyle: CSSProperties = horizontal
    ? { transform: `translateX(${dragOffset}px)` }
    : { transform: `translateY(${dragOffset}px)` };

  return (
    <div
      ref={rootRef}
      className={cn(styles.swipeable, className)}
      data-direction={direction}
      data-revealed={revealedSide}
      style={style}
    >
      <div className={styles.stage} data-direction={direction} data-stage="">
        {hasLeftActions ? (
          <div
            ref={leftActionsRef}
            className={cn(styles.actions, styles.actionsLeft)}
            data-open={revealedSide === "left" ? "" : undefined}
            inert={revealedSide !== "left"}
            aria-hidden={revealedSide !== "left"}
          >
            {leftActions}
          </div>
        ) : null}
        {hasRightActions ? (
          <div
            ref={rightActionsRef}
            className={cn(styles.actions, styles.actionsRight)}
            data-open={revealedSide === "right" ? "" : undefined}
            inert={revealedSide !== "right"}
            aria-hidden={revealedSide !== "right"}
          >
            {rightActions}
          </div>
        ) : null}
        <div
          {...surfaceProps}
          ref={surfaceRef}
          className={styles.surface}
          data-direction={direction}
          data-dragging={dragging ? "" : undefined}
          style={surfaceStyle}
        >
          {children}
        </div>
      </div>
      {fallbackActions ? (
        <div className={styles.fallback}>{fallbackActions}</div>
      ) : null}
    </div>
  );
}

export type {
  SwipeableDirection,
  SwipeableProps,
  SwipeableRevealSide,
} from "./swipeable.types";
