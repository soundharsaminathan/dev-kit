import { cn } from "@dev-ui/core";
import { useCanHover } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import type { AriaButtonProps } from "@react-aria/button";
import { useFocusWithin, useHover, useMove } from "@react-aria/interactions";
import { OverlayContainer } from "@react-aria/overlays";
import { useToast, useToastRegion } from "@react-aria/toast";
import { mergeProps } from "@react-aria/utils";
import {
  ToastQueue,
  type ToastStateProps,
  useToastQueue,
  useToastState,
} from "@react-stately/toast";
import type { DOMAttributes } from "@react-types/shared";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "../button/Button";
import { Loader } from "../loader/Loader";
import {
  EASE_OUT,
  SPRING_LAYOUT,
  TOAST_ENTER,
  TOAST_EXIT,
} from "../motion/ease";
import styles from "./toast.module.scss";
import type {
  ToastCloseProps,
  ToastContentProps,
  ToastContent as ToastContentValue,
  ToastDescriptionProps,
  ToastPosition,
  ToastProps,
  ToastProviderProps,
  ToastRegionProps,
  ToastTitleProps,
  ToastVariant,
} from "./toast.types";
import { ToastContext, useToastContext } from "./toast-context";

type ToastItemContextValue = {
  contentProps: DOMAttributes;
  titleProps: DOMAttributes;
  descriptionProps: DOMAttributes;
  closeButtonProps: AriaButtonProps;
};

type ToastStackContextValue = {
  isExpanded: boolean;
  position: ToastPosition;
};

const ToastItemContext = createContext<ToastItemContextValue | null>(null);
const ToastStackContext = createContext<ToastStackContextValue>({
  isExpanded: false,
  position: "top-right",
});

function useToastItemContext(component: string): ToastItemContextValue {
  const context = useContext(ToastItemContext);
  if (!context) {
    throw new Error(`${component} must be used within Toast`);
  }
  return context;
}

function resolveVariant(
  variant: ToastVariant | undefined,
  content: ToastContentValue,
): ToastVariant {
  return variant ?? content.variant ?? "neutral";
}

function createToastQueue<T = ToastContentValue>(
  options?: ConstructorParameters<typeof ToastQueue<T>>[0],
) {
  return new ToastQueue<T>(options);
}

const DEFAULT_TOAST_TIMEOUT = 3000;
const DEFAULT_MAX_VISIBLE_TOASTS = 3;
const SWIPE_DISMISS_THRESHOLD = 80;
const TOAST_ENTER_OFFSET_PX = 20;
const TOAST_STACK_OFFSET_PX = 8;
const TOAST_STACK_SCALE_STEP = 0.02;
const TOAST_EXIT_Z_INDEX = 60;
const TOAST_HOVER_SCALE = 1.01;

const VARIANT_ICON: Record<
  Exclude<ToastVariant, "loading">,
  "check-circle" | "x-circle" | "alert-triangle" | "info"
> = {
  success: "check-circle",
  error: "x-circle",
  warning: "alert-triangle",
  info: "info",
  neutral: "info",
};

function getEdgeOffsetY(position: ToastPosition): number {
  return position.startsWith("bottom")
    ? TOAST_ENTER_OFFSET_PX
    : -TOAST_ENTER_OFFSET_PX;
}

function getStackOffsetY(position: ToastPosition, stackIndex: number): number {
  const direction = position.startsWith("bottom") ? 1 : -1;
  return stackIndex * TOAST_STACK_OFFSET_PX * direction;
}

function useToastSwipe({
  enabled,
  onDismiss,
  panelRef,
}: {
  enabled: boolean;
  onDismiss: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
}): HTMLAttributes<HTMLDivElement> {
  const deltaRef = useRef({ x: 0, y: 0 });

  const { moveProps } = useMove({
    onMoveStart() {
      if (!enabled) {
        return;
      }
      const panel = panelRef.current;
      if (panel) {
        panel.dataset.swiping = "true";
      }
    },
    onMove({ deltaX, deltaY }) {
      if (!enabled) {
        return;
      }
      deltaRef.current = { x: deltaX, y: deltaY };
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const absX = Math.abs(deltaX);
      const progress = Math.min(absX / SWIPE_DISMISS_THRESHOLD, 1);
      panel.style.setProperty("--toast-swipe-x", `${deltaX}px`);
      panel.style.setProperty("--toast-swipe-y", `${deltaY * 0.15}px`);
      panel.style.setProperty("--toast-swipe-progress", String(progress));
    },
    onMoveEnd() {
      if (!enabled) {
        return;
      }
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const { x } = deltaRef.current;
      panel.style.removeProperty("--toast-swipe-x");
      panel.style.removeProperty("--toast-swipe-y");
      panel.style.removeProperty("--toast-swipe-progress");
      delete panel.dataset.swiping;
      deltaRef.current = { x: 0, y: 0 };

      if (Math.abs(x) >= SWIPE_DISMISS_THRESHOLD) {
        onDismiss();
      }
    },
  });

  return enabled ? moveProps : {};
}

function ToastProviderInner({
  children,
  position = "top-right",
  timeout = DEFAULT_TOAST_TIMEOUT,
  state,
}: {
  children: ReactNode;
  position: ToastPosition;
  timeout?: number;
  state: ReturnType<typeof useToastState<ToastContentValue>>;
}) {
  const toast = useCallback(
    (content: ToastContentValue, options?: Parameters<typeof state.add>[1]) => {
      const resolvedTimeout =
        options?.timeout ??
        (content.variant === "loading" ? undefined : timeout);

      return state.add(content, {
        ...options,
        ...(resolvedTimeout !== undefined ? { timeout: resolvedTimeout } : {}),
      });
    },
    [state, timeout],
  );

  const value = useMemo(
    () => ({
      state,
      position,
      toast,
    }),
    [state, position, toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion />
    </ToastContext.Provider>
  );
}

function ToastProviderWithState({
  children,
  position = "top-right",
  timeout = DEFAULT_TOAST_TIMEOUT,
  maxVisibleToasts = DEFAULT_MAX_VISIBLE_TOASTS,
  wrapUpdate,
}: {
  children: ReactNode;
  position?: ToastPosition;
  timeout?: number;
  maxVisibleToasts?: number;
  wrapUpdate?: ToastStateProps["wrapUpdate"];
}) {
  const state = useToastState<ToastContentValue>({
    maxVisibleToasts,
    ...(wrapUpdate !== undefined ? { wrapUpdate } : {}),
  });

  return (
    <ToastProviderInner position={position} timeout={timeout} state={state}>
      {children}
    </ToastProviderInner>
  );
}

function ToastProviderWithQueue({
  children,
  position = "top-right",
  timeout = DEFAULT_TOAST_TIMEOUT,
  queue,
}: ToastProviderProps & { queue: ToastQueue<ToastContentValue> }) {
  const state = useToastQueue(queue);

  return (
    <ToastProviderInner position={position} timeout={timeout} state={state}>
      {children}
    </ToastProviderInner>
  );
}

function ToastProvider({
  children,
  queue,
  position = "top-right",
  timeout = DEFAULT_TOAST_TIMEOUT,
  maxVisibleToasts = DEFAULT_MAX_VISIBLE_TOASTS,
  wrapUpdate,
}: ToastProviderProps) {
  if (queue) {
    return (
      <ToastProviderWithQueue
        queue={queue}
        position={position}
        timeout={timeout}
      >
        {children}
      </ToastProviderWithQueue>
    );
  }

  return (
    <ToastProviderWithState
      position={position}
      timeout={timeout}
      maxVisibleToasts={maxVisibleToasts}
      {...(wrapUpdate !== undefined ? { wrapUpdate } : {})}
    >
      {children}
    </ToastProviderWithState>
  );
}

function ToastStatusIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "loading") {
    return (
      <div className={styles.icon} data-slot="toast-icon">
        <Loader className={styles.spinner} aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className={styles.icon} data-slot="toast-icon" aria-hidden="true">
      <Icon name={VARIANT_ICON[variant]} />
    </div>
  );
}

function DefaultToastItem({
  item,
  stackIndex,
}: {
  item: Parameters<typeof Toast>[0]["toast"];
  stackIndex: number;
}) {
  const variant = resolveVariant(undefined, item.content);

  return (
    <Toast toast={item} variant={variant} stackIndex={stackIndex}>
      <ToastContent>
        <div className={styles.body}>
          <ToastStatusIcon variant={variant} />
          <div className={styles.message} data-slot="toast-message">
            <ToastTitle>{item.content.title}</ToastTitle>
            {item.content.description ? (
              <ToastDescription>{item.content.description}</ToastDescription>
            ) : null}
          </div>
        </div>
        {item.content.action ? (
          <div className={styles.actions} data-slot="toast-actions">
            <Button
              variant="quiet"
              size="sm"
              onClick={item.content.action.onPress}
            >
              {item.content.action.label}
            </Button>
          </div>
        ) : null}
      </ToastContent>
      <ToastClose />
    </Toast>
  );
}

function ToastRegion({
  position: positionProp,
  className,
  "aria-label": ariaLabel,
}: ToastRegionProps) {
  const { state, position: contextPosition } = useToastContext("ToastRegion");
  const position = positionProp ?? contextPosition;
  const ref = useRef<HTMLDivElement>(null);
  const { regionProps } = useToastRegion<ToastContentValue>(
    ariaLabel ? { "aria-label": ariaLabel } : {},
    state,
    ref,
  );
  const toastCount = state.visibleToasts.length;
  const isStacked = toastCount > 1;
  const [isRegionMounted, setIsRegionMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [heldKeys, setHeldKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const prevKeysRef = useRef<string[]>([]);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);

  const syncExpanded = useCallback(() => {
    setIsExpanded(hoverRef.current || focusRef.current);
  }, []);

  const { hoverProps: expandHoverProps } = useHover({
    onHoverStart() {
      hoverRef.current = true;
      syncExpanded();
    },
    onHoverEnd() {
      hoverRef.current = false;
      syncExpanded();
    },
  });

  const { focusWithinProps: expandFocusProps } = useFocusWithin({
    onFocusWithinChange(isFocusWithin) {
      focusRef.current = isFocusWithin;
      syncExpanded();
    },
  });

  const currentKeys = state.visibleToasts.map((item) => item.key);
  const prevKeys = prevKeysRef.current;
  const removedKeys = prevKeys.filter((key) => !currentKeys.includes(key));
  const addedKeys = currentKeys.filter((key) => !prevKeys.includes(key));

  if (
    removedKeys.length > 0 &&
    addedKeys.length > 0 &&
    addedKeys.some((key) => !heldKeys.has(key))
  ) {
    setHeldKeys(new Set([...heldKeys, ...addedKeys]));
  }

  if (
    prevKeys.length !== currentKeys.length ||
    prevKeys.some((key, index) => key !== currentKeys[index])
  ) {
    prevKeysRef.current = currentKeys;
  }

  if (toastCount > 0 && !isRegionMounted) {
    setIsRegionMounted(true);
  }

  const displayToasts = state.visibleToasts.filter(
    (item) => !heldKeys.has(item.key),
  );
  const displayCount = displayToasts.length;
  const displayStacked = displayCount > 1;

  const stackContext = useMemo(
    () => ({
      isExpanded: displayStacked ? isExpanded : true,
      position,
    }),
    [displayStacked, isExpanded, position],
  );

  if (!isRegionMounted) {
    return null;
  }

  return (
    <OverlayContainer>
      <ToastStackContext.Provider value={stackContext}>
        <div
          {...mergeProps(regionProps, expandHoverProps, expandFocusProps)}
          ref={ref}
          data-toast-region=""
          data-position={position}
          data-count={displayCount}
          {...(displayStacked ? { "data-stacked": "" } : {})}
          {...(displayStacked && isExpanded ? { "data-expanded": "" } : {})}
          className={cn(styles.region, className)}
        >
          <AnimatePresence
            initial={false}
            mode="popLayout"
            onExitComplete={() => {
              if (heldKeys.size > 0) {
                setHeldKeys(new Set());
              }
              if (state.visibleToasts.length === 0) {
                setIsRegionMounted(false);
              }
            }}
          >
            {displayToasts.map((item, index) => (
              <DefaultToastItem key={item.key} item={item} stackIndex={index} />
            ))}
          </AnimatePresence>
        </div>
      </ToastStackContext.Provider>
    </OverlayContainer>
  );
}

function Toast({
  toast,
  variant,
  className,
  children,
  stackIndex = 0,
  style,
  ...props
}: ToastProps & {
  stackIndex?: number;
  style?: CSSProperties;
}) {
  const { state } = useToastContext("Toast");
  const { isExpanded, position } = useContext(ToastStackContext);
  const ref = useRef<HTMLDivElement>(null);
  const resolvedVariant = resolveVariant(variant, toast.content);
  const reducedMotion = useReducedMotion();
  const canHover = useCanHover();
  const {
    toastProps,
    contentProps,
    titleProps,
    descriptionProps,
    closeButtonProps,
  } = useToast({ toast, ...props }, state, ref);

  const swipeProps = useToastSwipe({
    enabled: !reducedMotion,
    onDismiss: () => state.close(toast.key),
    panelRef: ref,
  });

  const itemContext = useMemo(
    () => ({
      contentProps,
      titleProps,
      descriptionProps,
      closeButtonProps,
    }),
    [closeButtonProps, contentProps, descriptionProps, titleProps],
  );

  const edgeY = getEdgeOffsetY(position);
  const collapsed = !isExpanded;
  const stackY = collapsed ? getStackOffsetY(position, stackIndex) : 0;
  const stackScale = collapsed ? 1 - stackIndex * TOAST_STACK_SCALE_STEP : 1;

  return (
    <ToastItemContext.Provider value={itemContext}>
      <motion.div
        className={styles.shell}
        layout={!reducedMotion}
        initial={
          reducedMotion ? { opacity: 0 } : { opacity: 0, y: edgeY, scale: 0.96 }
        }
        animate={
          reducedMotion
            ? { opacity: 1 }
            : { opacity: 1, y: stackY, scale: stackScale }
        }
        exit={
          reducedMotion
            ? { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }
            : {
                opacity: 0,
                y: edgeY,
                scale: 0.96,
                zIndex: TOAST_EXIT_Z_INDEX,
                transition: TOAST_EXIT,
              }
        }
        {...(!reducedMotion && canHover && (isExpanded || stackIndex === 0)
          ? { whileHover: { scale: stackScale * TOAST_HOVER_SCALE } }
          : {})}
        transition={
          reducedMotion
            ? { duration: 0.15, ease: EASE_OUT }
            : {
                layout: SPRING_LAYOUT,
                opacity: TOAST_ENTER,
                y: TOAST_ENTER,
                scale: TOAST_ENTER,
                zIndex: { duration: 0 },
              }
        }
        data-stack-index={String(stackIndex)}
        style={{
          ["--toast-stack-index" as string]: stackIndex,
          zIndex: TOAST_EXIT_Z_INDEX - stackIndex,
        }}
      >
        <div
          {...(mergeProps(
            toastProps,
            swipeProps,
          ) as HTMLAttributes<HTMLDivElement>)}
          ref={ref}
          data-toast=""
          data-variant={resolvedVariant}
          data-stack-index={String(stackIndex)}
          style={
            style
              ? {
                  ...style,
                  ["--toast-stack-index" as string]: stackIndex,
                }
              : { ["--toast-stack-index" as string]: stackIndex }
          }
          className={cn(styles.toast, className)}
        >
          {children}
        </div>
      </motion.div>
    </ToastItemContext.Provider>
  );
}

function ToastContent({ className, children, ...props }: ToastContentProps) {
  const { contentProps } = useToastItemContext("ToastContent");

  return (
    <div
      {...mergeProps(contentProps, props)}
      data-toast-content=""
      className={cn(styles.content, className)}
    >
      {children}
    </div>
  );
}

function ToastTitle({ className, children, ...props }: ToastTitleProps) {
  const { titleProps } = useToastItemContext("ToastTitle");

  return (
    <div
      {...mergeProps(titleProps, props)}
      data-toast-title=""
      className={cn(styles.title, className)}
    >
      {children}
    </div>
  );
}

function ToastDescription({
  className,
  children,
  ...props
}: ToastDescriptionProps) {
  const { descriptionProps } = useToastItemContext("ToastDescription");

  return (
    <div
      {...mergeProps(descriptionProps, props)}
      data-toast-description=""
      className={cn(styles.description, className)}
    >
      {children}
    </div>
  );
}

function ToastClose({ className, ...props }: ToastCloseProps) {
  const { closeButtonProps } = useToastItemContext("ToastClose");

  return (
    <Button
      variant="quiet"
      isIconOnly
      {...mergeProps(closeButtonProps, props)}
      data-toast-close=""
      className={cn(styles.close, className)}
    >
      <Icon name="x" />
    </Button>
  );
}

ToastProvider.displayName = "ToastProvider";
ToastRegion.displayName = "ToastRegion";
Toast.displayName = "Toast";
Object.assign(ToastContent, { displayName: "ToastContent" });
ToastTitle.displayName = "ToastTitle";
ToastDescription.displayName = "ToastDescription";
ToastClose.displayName = "ToastClose";

export { ToastQueue } from "@react-stately/toast";
export type {
  ToastCloseProps,
  ToastContentProps,
  ToastDescriptionProps,
  ToastPosition,
  ToastProps,
  ToastProviderProps,
  ToastRegionProps,
  ToastTitleProps,
  ToastVariant,
} from "./toast.types";
export { useToastContext } from "./toast-context";
export {
  createToastQueue,
  Toast,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastProvider,
  ToastRegion,
  ToastTitle,
};
