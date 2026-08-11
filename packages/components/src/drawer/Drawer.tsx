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
  return (
    target instanceof Element && Boolean(target.closest(SWIPE_IGNORE_SELECTOR))
  );
}

function allowInteractiveSwipeProps(
  moveProps: DrawerMoveProps,
): DrawerMoveProps {
  const { onPointerDown, ...rest } = moveProps;
  if (!onPointerDown) {
    return rest;
  }

  return {
    ...rest,
    onPointerDown: (event) => {
      if (shouldIgnoreSwipeTarget(event.target)) {
        return;
      }
      onPointerDown(event);
    },
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
  panel: HTMLDivElement,
  overlay: HTMLDivElement | null,
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

  panel.style.setProperty("--drawer-swipe-movement-x", `${movementX}px`);
  panel.style.setProperty("--drawer-swipe-movement-y", `${movementY}px`);
  panel.style.setProperty("--drawer-swipe-progress", String(progress));
  panel.dataset.swiping = "true";

  if (overlay) {
    overlay.style.setProperty("--drawer-swipe-progress", String(progress));
    overlay.dataset.swiping = "true";
  }
}

function clearSwipeStyle(
  panel: HTMLDivElement,
  overlay: HTMLDivElement | null,
  { keepOffset = false }: { keepOffset?: boolean } = {},
) {
  if (!keepOffset) {
    panel.style.removeProperty("--drawer-swipe-movement-x");
    panel.style.removeProperty("--drawer-swipe-movement-y");
    panel.style.removeProperty("--drawer-swipe-progress");
    overlay?.style.removeProperty("--drawer-swipe-progress");
  }
  delete panel.dataset.swiping;
  if (overlay) {
    delete overlay.dataset.swiping;
  }
}

function useDrawerSwipe({
  placement,
  swipeToDismiss,
  onDismiss,
  panelRef,
  overlayRef,
}: {
  placement: DrawerPlacement;
  swipeToDismiss: boolean;
  onDismiss: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
}): DrawerMoveProps {
  const deltaRef = useRef({ x: 0, y: 0 });

  const { moveProps } = useMove({
    onMoveStart() {
      if (!swipeToDismiss) {
        return;
      }

      const panel = panelRef.current;
      const overlay = overlayRef.current;
      if (panel) {
        panel.dataset.swiping = "true";
      }
      if (overlay) {
        overlay.dataset.swiping = "true";
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
      applySwipeStyle(panel, overlayRef.current, placement, deltaX, deltaY);
    },
    onMoveEnd() {
      if (!swipeToDismiss) {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const overlay = overlayRef.current;
      const { x, y } = deltaRef.current;
      const dismissDelta = getSwipeDelta(placement, x, y);

      if (dismissDelta >= DISMISS_THRESHOLD) {
        clearSwipeStyle(panel, overlay, { keepOffset: true });
        onDismiss();
        return;
      }

      clearSwipeStyle(panel, overlay);
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
  const overlayRef = useRef<HTMLDivElement>(null);
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
    overlayRef,
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

  useLayoutEffect(() => {
    if (!isEnding) {
      return;
    }

    const panel = panelRef.current;
    if (panel) {
      void panel.getBoundingClientRect();
    }
  }, [isEnding]);

  useLayoutEffect(() => {
    if (!state.isOpen || !isPresent || isStarting) {
      return;
    }

    const panel = panelRef.current;
    if (!panel || panel.contains(document.activeElement)) {
      return;
    }

    const focusTarget = getInitialFocusTarget(panel);
    if (focusTarget !== true) {
      focusTarget.focus();
      return;
    }

    if (!panel.hasAttribute("tabindex")) {
      panel.tabIndex = -1;
    }
    panel.focus();
  }, [state.isOpen, isPresent, isStarting]);

  useEffect(() => {
    if (!isEnding) {
      return;
    }

    const panel = panelRef.current;
    const overlay = overlayRef.current;
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
      clearSwipeStyle(panel, overlay);
      setIsPresent(false);
      setIsEnding(false);
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === panel && event.propertyName === "transform") {
        finishExit();
        return;
      }
      if (event.target === overlay && event.propertyName === "opacity") {
        finishExit();
      }
    };

    panel.addEventListener("transitionend", onTransitionEnd);
    overlay?.addEventListener("transitionend", onTransitionEnd);
    const timeout = window.setTimeout(finishExit, EXIT_ANIMATION_MS);

    return () => {
      panel.removeEventListener("transitionend", onTransitionEnd);
      overlay?.removeEventListener("transitionend", onTransitionEnd);
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

  const openAttr = state.isOpen && !isEnding ? "" : undefined;

  return (
    <DrawerContext.Provider value={{ placement, moveProps: swipeProps }}>
      <DrawerPlacementContext.Provider value={placement}>
        <OverlayContainer>
          <Overlay>
            <div
              ref={overlayRef}
              className={styles.overlay}
              data-starting-style={isStarting ? "" : undefined}
              data-ending-style={isEnding ? "" : undefined}
            >
              {isDismissable ? (
                <button
                  type="button"
                  {...underlayProps}
                  aria-label="Dismiss"
                  className={styles.backdrop}
                  data-open={openAttr}
                  onClick={() => {
                    state.close();
                  }}
                />
              ) : (
                <div
                  {...underlayProps}
                  className={styles.backdrop}
                  data-open={openAttr}
                />
              )}
              <div
                className={cn(styles.viewport, styles[`viewport-${placement}`])}
                data-open={openAttr}
              >
                <div
                  {...mergeProps(modalProps, swipeProps)}
                  ref={panelRef}
                  data-drawer=""
                  data-open={openAttr}
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
