import { cn } from "@dev-ui/core";
import { useMove } from "@react-aria/interactions";
import {
  DismissButton,
  Overlay,
  OverlayContainer,
  useModalOverlay,
} from "@react-aria/overlays";
import { mergeProps } from "@react-aria/utils";
import { useOverlayTriggerState } from "@react-stately/overlays";
import {
  createContext,
  type HTMLAttributes,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./drawer.module.scss";
import type {
  DrawerHandleProps,
  DrawerIndentBackgroundProps,
  DrawerIndentProps,
  DrawerPlacement,
  DrawerPopupClassName,
  DrawerProps,
  DrawerProviderProps,
  DrawerSwipeAreaProps,
} from "./drawer.types";

const DISMISS_THRESHOLD = 100;
const EXIT_ANIMATION_MS = 550;
const SWIPE_IGNORE_SELECTOR =
  "input, textarea, select, option, button, a, label, [contenteditable]:not([contenteditable='false']), [data-input], [role='textbox'], [role='searchbox'], [role='combobox'], [role='spinbutton']";

const DrawerPlacementContext = createContext<DrawerPlacement>("bottom");

type DrawerMoveProps = HTMLAttributes<HTMLDivElement>;

type DrawerContextValue = {
  placement: DrawerPlacement;
  moveProps: DrawerMoveProps;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawerContext(): DrawerContextValue {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("Drawer subcomponents must be used within Drawer");
  }
  return context;
}

function shouldIgnoreSwipeTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(SWIPE_IGNORE_SELECTOR));
}

function allowInteractiveSwipeProps(moveProps: DrawerMoveProps): DrawerMoveProps {
  const { onPointerDown, onTouchStart, onMouseDown, onKeyDown, ...rest } =
    moveProps;

  return {
    ...rest,
    ...(onPointerDown
      ? {
          onPointerDown: (event) => {
            if (shouldIgnoreSwipeTarget(event.target)) {
              return;
            }
            onPointerDown(event);
          },
        }
      : {}),
    ...(onTouchStart
      ? {
          onTouchStart: (event) => {
            if (shouldIgnoreSwipeTarget(event.target)) {
              return;
            }
            onTouchStart(event);
          },
        }
      : {}),
    ...(onMouseDown
      ? {
          onMouseDown: (event) => {
            if (shouldIgnoreSwipeTarget(event.target)) {
              return;
            }
            onMouseDown(event);
          },
        }
      : {}),
    ...(onKeyDown
      ? {
          onKeyDown: (event) => {
            if (shouldIgnoreSwipeTarget(event.target)) {
              return;
            }
            onKeyDown(event);
          },
        }
      : {}),
  };
}

function resolveClassName(
  className: DrawerPopupClassName | undefined,
  open: boolean,
) {
  return typeof className === "function" ? className({ open }) : className;
}

function getInitialFocusTarget(popupElement: HTMLDivElement | null) {
  return (
    popupElement?.querySelector<HTMLElement>(
      '[role="dialog"], [role="menu"], [role="listbox"], [role="tree"], [tabindex]',
    ) ?? true
  );
}

function getSwipeDelta(
  placement: DrawerPlacement,
  deltaX: number,
  deltaY: number,
) {
  switch (placement) {
    case "bottom":
      return Math.max(0, deltaY);
    case "top":
      return Math.max(0, -deltaY);
    case "left":
      return Math.max(0, -deltaX);
    case "right":
      return Math.max(0, deltaX);
  }
}

function applySwipeStyle(
  element: HTMLDivElement,
  placement: DrawerPlacement,
  deltaX: number,
  deltaY: number,
) {
  const dismissDelta = getSwipeDelta(placement, deltaX, deltaY);
  const progress = Math.min(dismissDelta / DISMISS_THRESHOLD, 1);
  const movementX =
    placement === "left"
      ? -dismissDelta
      : placement === "right"
        ? dismissDelta
        : 0;
  const movementY =
    placement === "top"
      ? -dismissDelta
      : placement === "bottom"
        ? dismissDelta
        : 0;

  element.style.setProperty("--drawer-swipe-movement-x", `${movementX}px`);
  element.style.setProperty("--drawer-swipe-movement-y", `${movementY}px`);
  element.style.setProperty("--drawer-swipe-progress", String(progress));
  element.dataset.swiping = "true";
}

function clearSwipeStyle(element: HTMLDivElement) {
  element.style.removeProperty("--drawer-swipe-movement-x");
  element.style.removeProperty("--drawer-swipe-movement-y");
  element.style.removeProperty("--drawer-swipe-progress");
  delete element.dataset.swiping;
}

function useDrawerSwipe({
  placement,
  swipeToDismiss,
  onDismiss,
  panelRef,
}: {
  placement: DrawerPlacement;
  swipeToDismiss: boolean;
  onDismiss: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
}): DrawerMoveProps {
  const deltaRef = useRef({ x: 0, y: 0 });

  const { moveProps } = useMove({
    onMoveStart() {
      if (!swipeToDismiss) {
        return;
      }

      const panel = panelRef.current;
      if (panel) {
        panel.dataset.swiping = "true";
      }
    },
    onMove({ deltaX, deltaY }) {
      if (!swipeToDismiss) {
        return;
      }

      deltaRef.current = { x: deltaX, y: deltaY };

      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      applySwipeStyle(panel, placement, deltaX, deltaY);
    },
    onMoveEnd() {
      if (!swipeToDismiss) {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const { x, y } = deltaRef.current;
      const dismissDelta = getSwipeDelta(placement, x, y);
      clearSwipeStyle(panel);

      if (dismissDelta >= DISMISS_THRESHOLD) {
        onDismiss();
      }
    },
  });

  return swipeToDismiss ? allowInteractiveSwipeProps(moveProps) : {};
}

function Drawer({
  children,
  className,
  defaultOpen,
  isDismissable = true,
  isKeyboardDismissDisabled = false,
  isOpen,
  onOpenChange,
  placement = "bottom",
  swipeToDismiss = true,
  style,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openFrameRef = useRef<number | undefined>(undefined);
  const state = useOverlayTriggerState({
    ...(isOpen !== undefined ? { isOpen } : {}),
    ...(defaultOpen !== undefined ? { defaultOpen } : {}),
    ...(onOpenChange !== undefined ? { onOpenChange } : {}),
  });
  const isPresentRef = useRef(state.isOpen);
  const [isPresent, setIsPresent] = useState(state.isOpen);
  const [isStarting, setIsStarting] = useState(state.isOpen);
  const [isEnding, setIsEnding] = useState(false);

  isPresentRef.current = isPresent;

  const { modalProps, underlayProps } = useModalOverlay(
    {
      isDismissable,
      isKeyboardDismissDisabled,
    },
    state,
    panelRef,
  );

  const swipeProps = useDrawerSwipe({
    placement,
    swipeToDismiss,
    onDismiss: state.close,
    panelRef,
  });

  useLayoutEffect(() => {
    if (state.isOpen) {
      setIsPresent(true);
      setIsEnding(false);
      setIsStarting(true);

      openFrameRef.current = requestAnimationFrame(() => {
        openFrameRef.current = requestAnimationFrame(() => {
          setIsStarting(false);
        });
      });

      const focusTarget = getInitialFocusTarget(panelRef.current);
      if (focusTarget !== true) {
        focusTarget.focus();
      }

      return () => {
        if (openFrameRef.current !== undefined) {
          cancelAnimationFrame(openFrameRef.current);
        }
      };
    }

    if (isPresentRef.current) {
      setIsStarting(false);
      setIsEnding(true);
    }
  }, [state.isOpen]);

  useEffect(() => {
    if (!isEnding) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      setIsPresent(false);
      setIsEnding(false);
      return;
    }

    let finished = false;
    const finishExit = () => {
      if (finished) {
        return;
      }
      finished = true;
      setIsPresent(false);
      setIsEnding(false);
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== panel || event.propertyName !== "transform") {
        return;
      }
      finishExit();
    };

    panel.addEventListener("transitionend", onTransitionEnd);
    const timeout = window.setTimeout(finishExit, EXIT_ANIMATION_MS);

    return () => {
      panel.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(timeout);
    };
  }, [isEnding]);

  if (!isPresent) {
    return (
      <DrawerContext.Provider value={{ placement, moveProps: {} }}>
        {null}
      </DrawerContext.Provider>
    );
  }

  return (
    <DrawerContext.Provider value={{ placement, moveProps: swipeProps }}>
      <DrawerPlacementContext.Provider value={placement}>
        <OverlayContainer>
          <Overlay>
            <div className={styles.overlay}>
              {isDismissable ? (
                <button
                  type="button"
                  {...underlayProps}
                  aria-label="Dismiss"
                  className={styles.backdrop}
                  data-open=""
                  data-starting-style={isStarting ? "" : undefined}
                  data-ending-style={isEnding ? "" : undefined}
                  onClick={() => {
                    state.close();
                  }}
                />
              ) : (
                <div
                  {...underlayProps}
                  className={styles.backdrop}
                  data-open=""
                  data-starting-style={isStarting ? "" : undefined}
                  data-ending-style={isEnding ? "" : undefined}
                />
              )}
              <div
                className={cn(styles.viewport, styles[`viewport-${placement}`])}
                data-open=""
              >
                <div
                  {...mergeProps(modalProps, swipeProps)}
                  ref={panelRef}
                  data-drawer=""
                  data-open=""
                  data-swipe-disabled={swipeToDismiss ? undefined : ""}
                  data-starting-style={isStarting ? "" : undefined}
                  data-ending-style={isEnding ? "" : undefined}
                  className={cn(
                    styles.popup,
                    styles[`popup-${placement}`],
                    resolveClassName(className, state.isOpen),
                  )}
                  style={style}
                >
                  {isDismissable ? (
                    <DismissButton onDismiss={state.close} />
                  ) : null}
                  {children}
                  {isDismissable ? (
                    <DismissButton onDismiss={state.close} />
                  ) : null}
                </div>
              </div>
            </div>
          </Overlay>
        </OverlayContainer>
      </DrawerPlacementContext.Provider>
    </DrawerContext.Provider>
  );
}

function DrawerHandle({ className, ...props }: DrawerHandleProps) {
  const { placement, moveProps } = useDrawerContext();
  const orientation =
    placement === "top" || placement === "bottom" ? "horizontal" : "vertical";

  return (
    <div
      {...mergeProps(moveProps, props)}
      role="presentation"
      aria-hidden="true"
      data-orientation={orientation}
      data-placement={placement}
      data-slot="drawer-handle"
      className={cn(styles.handle, className)}
    />
  );
}

function DrawerSwipeArea({ className, ...props }: DrawerSwipeAreaProps) {
  const placement = useContext(DrawerPlacementContext);

  return (
    <div
      className={cn(
        styles.swipeArea,
        styles[`swipeArea-${placement}`],
        className,
      )}
      data-slot="drawer-swipe-area"
      {...props}
    />
  );
}

function DrawerProvider({ children }: DrawerProviderProps) {
  return children;
}

function DrawerIndent({ className, ...props }: DrawerIndentProps) {
  return <div className={cn(styles.indent, className)} {...props} />;
}

function DrawerIndentBackground({
  className,
  ...props
}: DrawerIndentBackgroundProps) {
  return <div className={cn(styles.indentBackground, className)} {...props} />;
}

export type {
  DrawerHandleProps,
  DrawerIndentBackgroundProps,
  DrawerIndentProps,
  DrawerPlacement,
  DrawerProps,
  DrawerProviderProps,
  DrawerSwipeAreaProps,
} from "./drawer.types";
export {
  Drawer,
  DrawerHandle,
  DrawerIndent,
  DrawerIndentBackground,
  DrawerProvider,
  DrawerSwipeArea,
};
