import { cn } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import type { AriaButtonProps } from "@react-aria/button";
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
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Button } from "../button/Button";
import { Loader } from "../loader/Loader";
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

const ToastItemContext = createContext<ToastItemContextValue | null>(null);

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
const DEFAULT_MAX_VISIBLE_TOASTS = 5;

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
          {variant === "loading" ? (
            <div className={styles.icon} data-slot="toast-icon">
              <Loader className={styles.spinner} aria-label="Loading" />
            </div>
          ) : null}
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

  if (toastCount === 0) {
    return null;
  }

  return (
    <OverlayContainer>
      <div
        {...regionProps}
        ref={ref}
        data-toast-region=""
        data-position={position}
        data-count={toastCount}
        {...(isStacked ? { "data-stacked": "" } : {})}
        className={cn(styles.region, className)}
      >
        {state.visibleToasts.map((item, index) => (
          <DefaultToastItem key={item.key} item={item} stackIndex={index} />
        ))}
      </div>
    </OverlayContainer>
  );
}

function Toast({
  toast,
  variant,
  className,
  children,
  stackIndex,
  style,
  ...props
}: ToastProps & {
  stackIndex?: number;
  style?: CSSProperties;
}) {
  const { state } = useToastContext("Toast");
  const ref = useRef<HTMLDivElement>(null);
  const resolvedVariant = resolveVariant(variant, toast.content);
  const {
    toastProps,
    contentProps,
    titleProps,
    descriptionProps,
    closeButtonProps,
  } = useToast({ toast, ...props }, state, ref);

  const itemContext = useMemo(
    () => ({
      contentProps,
      titleProps,
      descriptionProps,
      closeButtonProps,
    }),
    [closeButtonProps, contentProps, descriptionProps, titleProps],
  );

  return (
    <ToastItemContext.Provider value={itemContext}>
      <div
        {...toastProps}
        ref={ref}
        data-toast=""
        data-variant={resolvedVariant}
        {...(stackIndex !== undefined
          ? { "data-stack-index": String(stackIndex) }
          : {})}
        style={
          stackIndex !== undefined
            ? {
                ...style,
                ["--toast-stack-index" as string]: stackIndex,
              }
            : style
        }
        className={cn(styles.toast, className)}
      >
        {children}
      </div>
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
