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
  AnimatePresence,
  animate,
  type HTMLMotionProps,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  createContext,
  type HTMLAttributes,
  type RefObject,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import {
  getDrawerPanelMotion,
  getDrawerPanelTransition,
} from "../motion/drawer-motion";
import { EASE_DRAWER, SPRING_DRAWER_SWIPE } from "../motion/ease";
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

function getSwipeOffset(
  placement: DrawerPlacement,
  dismissDelta: number,
): { x: number; y: number } {
  switch (placement) {
    case "bottom":
      return { x: 0, y: dismissDelta };
    case "top":
      return { x: 0, y: -dismissDelta };
    case "left":
      return { x: -dismissDelta, y: 0 };
    case "right":
      return { x: dismissDelta, y: 0 };
  }
}

function applySwipeStyle({
  element,
  placement,
  deltaX,
  deltaY,
  swipeX,
  swipeY,
}: {
  element: HTMLDivElement;
  placement: DrawerPlacement;
  deltaX: number;
  deltaY: number;
  swipeX: MotionValue<number>;
  swipeY: MotionValue<number>;
}) {
  const dismissDelta = getSwipeDelta(placement, deltaX, deltaY);
  const progress = Math.min(dismissDelta / DISMISS_THRESHOLD, 1);
  const { x, y } = getSwipeOffset(placement, dismissDelta);
  const overlay = element.closest('[class*="overlay"]') as HTMLElement | null;

  swipeX.set(x);
  swipeY.set(y);
  overlay?.style.setProperty("--drawer-swipe-progress", String(progress));
  element.dataset.swiping = "true";
}

function clearSwipeStyle({
  element,
  swipeX,
  swipeY,
}: {
  element: HTMLDivElement;
  swipeX: MotionValue<number>;
  swipeY: MotionValue<number>;
}) {
  const overlay = element.closest('[class*="overlay"]') as HTMLElement | null;

  swipeX.set(0);
  swipeY.set(0);
  overlay?.style.removeProperty("--drawer-swipe-progress");
  delete element.dataset.swiping;
}

function resetSwipeOffset(
  swipeX: MotionValue<number>,
  swipeY: MotionValue<number>,
) {
  animate(swipeX, 0, SPRING_DRAWER_SWIPE);
  animate(swipeY, 0, SPRING_DRAWER_SWIPE);
}

function useDrawerSwipe({
  placement,
  swipeToDismiss,
  onDismiss,
  panelRef,
  swipeX,
  swipeY,
}: {
  placement: DrawerPlacement;
  swipeToDismiss: boolean;
  onDismiss: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  swipeX: MotionValue<number>;
  swipeY: MotionValue<number>;
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
      applySwipeStyle({
        element: panel,
        placement,
        deltaX,
        deltaY,
        swipeX,
        swipeY,
      });
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
      clearSwipeStyle({ element: panel, swipeX, swipeY });

      if (dismissDelta >= DISMISS_THRESHOLD) {
        onDismiss();
        return;
      }

      resetSwipeOffset(swipeX, swipeY);
    },
  });

  return swipeToDismiss ? moveProps : {};
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
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const swipeX = useMotionValue(0);
  const swipeY = useMotionValue(0);
  const state = useOverlayTriggerState({
    ...(isOpen !== undefined ? { isOpen } : {}),
    ...(defaultOpen !== undefined ? { defaultOpen } : {}),
    ...(onOpenChange !== undefined ? { onOpenChange } : {}),
  });

  const { modalProps, underlayProps } = useModalOverlay(
    {
      isDismissable,
      isKeyboardDismissDisabled,
    },
    state,
    panelRef,
  );
  const { style: _backdropStyle, ...backdropProps } = underlayProps;
  const { style: _panelStyle, ...panelMotionProps } = modalProps;

  const swipeProps = useDrawerSwipe({
    placement,
    swipeToDismiss,
    onDismiss: state.close,
    panelRef,
    swipeX,
    swipeY,
  });

  const panelMotion = getDrawerPanelMotion(placement, reducedMotion);
  const panelTransition = getDrawerPanelTransition(reducedMotion);

  useLayoutEffect(() => {
    if (!state.isOpen) {
      return;
    }

    const focusTarget = getInitialFocusTarget(panelRef.current);
    if (focusTarget !== true) {
      focusTarget.focus();
    }
  }, [state.isOpen]);

  return (
    <DrawerContext.Provider
      value={{ placement, moveProps: state.isOpen ? swipeProps : {} }}
    >
      <DrawerPlacementContext.Provider value={placement}>
        <OverlayContainer>
          <AnimatePresence>
            {state.isOpen ? (
              <Overlay key="drawer">
                <div className={styles.overlay} data-drawer-root="">
                  {isDismissable ? (
                    <motion.button
                      type="button"
                      {...(backdropProps as unknown as HTMLMotionProps<"button">)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE_DRAWER }}
                      aria-label="Dismiss"
                      className={styles.backdrop}
                      data-drawer-backdrop=""
                      data-open=""
                      onClick={() => {
                        state.close();
                      }}
                    />
                  ) : (
                    <motion.div
                      {...(backdropProps as unknown as HTMLMotionProps<"div">)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE_DRAWER }}
                      className={styles.backdrop}
                      data-drawer-backdrop=""
                      data-open=""
                    />
                  )}
                  <div
                    className={cn(
                      styles.viewport,
                      styles[`viewport-${placement}`],
                    )}
                    data-drawer-viewport=""
                    data-open=""
                  >
                    <motion.div
                      {...(mergeProps(
                        panelMotionProps,
                        swipeProps,
                      ) as unknown as HTMLMotionProps<"div">)}
                      ref={panelRef}
                      initial={panelMotion.initial}
                      animate={panelMotion.animate}
                      exit={panelMotion.exit}
                      transition={panelTransition}
                      style={
                        {
                          x: swipeX,
                          y: swipeY,
                          ...(style ?? {}),
                        } as unknown as NonNullable<
                          HTMLMotionProps<"div">["style"]
                        >
                      }
                      data-drawer=""
                      data-open=""
                      data-swipe-disabled={swipeToDismiss ? undefined : ""}
                      className={cn(
                        styles.popup,
                        styles[`popup-${placement}`],
                        resolveClassName(className, state.isOpen),
                      )}
                    >
                      {isDismissable ? (
                        <DismissButton onDismiss={state.close} />
                      ) : null}
                      {children}
                      {isDismissable ? (
                        <DismissButton onDismiss={state.close} />
                      ) : null}
                    </motion.div>
                  </div>
                </div>
              </Overlay>
            ) : null}
          </AnimatePresence>
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
