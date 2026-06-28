import { cn, composeRefs } from "@dev-ui/core";
import { useInteractOutside } from "@react-aria/interactions";
import { useTooltip, useTooltipTrigger } from "@react-aria/tooltip";
import { mergeProps } from "@react-aria/utils";
import { useTooltipTriggerState } from "@react-stately/tooltip";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useOverlayExit } from "../hooks/use-overlay-exit";
import { findChildByDisplayName } from "../list-box/collection-utils";
import styles from "./tooltip.module.scss";
import type {
  TooltipContentProps,
  TooltipContextValue,
  TooltipProps,
} from "./tooltip.types";
import { useCanHover } from "./use-can-hover";
import { useTouchTooltipTriggerProps } from "./use-touch-tooltip-trigger";

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext(component: string): TooltipContextValue {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error(`${component} must be used within Tooltip`);
  }
  return context;
}

function getTriggerChild(children: ReactNode, contentDisplayName: string) {
  let found: ReactElement | null = null;
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) {
      return;
    }
    const type = child.type as { displayName?: string };
    if (type.displayName !== contentDisplayName) {
      found = child as ReactElement;
    }
  });
  return found;
}

function Tooltip({
  children,
  className,
  fullWidth,
  touchBehavior = "toggle",
  delay = 0,
  closeDelay = 0,
  ...props
}: TooltipProps) {
  const canHover = useCanHover();
  const state = useTooltipTriggerState({
    ...props,
    delay,
    closeDelay,
  });
  const triggerRef = useRef<HTMLElement>(null);
  const { triggerProps: ariaTriggerProps, tooltipProps } = useTooltipTrigger(
    props,
    state,
    triggerRef,
  );
  const triggerProps = useTouchTooltipTriggerProps(
    ariaTriggerProps,
    state,
    canHover,
    touchBehavior,
  );

  const contentChild = findChildByDisplayName(children, "TooltipContent");
  const triggerChild = getTriggerChild(children, "TooltipContent");

  const contextValue = useMemo(
    () => ({
      state,
      triggerProps,
      tooltipProps,
      triggerRef,
      fullWidth: Boolean(fullWidth),
      canHover,
    }),
    [state, triggerProps, tooltipProps, fullWidth, canHover],
  );

  const renderedTrigger = triggerChild
    ? cloneElement(
        triggerChild as ReactElement<Record<string, unknown>>,
        mergeProps(
          (triggerChild as ReactElement).props as Record<string, unknown>,
          triggerProps,
          fullWidth ? { "data-tooltip-trigger": "true" } : {},
          {
            ref: composeRefs(
              triggerRef,
              (
                (triggerChild as ReactElement).props as {
                  ref?: React.Ref<HTMLElement>;
                }
              ).ref,
            ),
          },
        ),
      )
    : null;

  return (
    <TooltipContext.Provider value={contextValue}>
      <span
        data-tooltip=""
        data-full-width={fullWidth ? "true" : undefined}
        className={cn(styles.root, className)}
      >
        {renderedTrigger}
        {contentChild}
      </span>
    </TooltipContext.Provider>
  );
}

const OVERLAY_EXIT_DURATION_MS = 200;

function TooltipContent({
  children,
  className,
  placement = "bottom",
  ref,
  ...props
}: TooltipContentProps) {
  const { state, tooltipProps, triggerRef, fullWidth, canHover } =
    useTooltipContext("TooltipContent");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { tooltipProps: overlayTooltipProps } = useTooltip(
    mergeProps(tooltipProps, props) as Parameters<typeof useTooltip>[0],
    state,
  );
  const { isRendered, dataState, onTransitionEnd } = useOverlayExit(
    state.isOpen,
    OVERLAY_EXIT_DURATION_MS,
  );

  useInteractOutside({
    ref: tooltipRef,
    onInteractOutside: () => {
      state.close(true);
    },
    isDisabled: !state.isOpen || canHover,
  });

  useLayoutEffect(() => {
    if (!isRendered || !fullWidth) {
      return;
    }

    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) {
      return;
    }

    const syncTriggerWidth = () => {
      tooltip.style.setProperty(
        "--trigger-width",
        `${trigger.getBoundingClientRect().width}px`,
      );
    };

    syncTriggerWidth();

    const observer = new ResizeObserver(syncTriggerWidth);
    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [isRendered, fullWidth, triggerRef]);

  if (!isRendered) {
    return null;
  }

  return (
    <div
      {...mergeProps(overlayTooltipProps, props)}
      ref={composeRefs(tooltipRef, ref)}
      data-tooltip-content=""
      data-placement={placement}
      data-match-trigger-width={fullWidth ? "true" : undefined}
      role="tooltip"
      className={cn(styles.content, className)}
    >
      <div
        data-state={dataState}
        data-placement={placement}
        onTransitionEnd={onTransitionEnd}
        className={styles.contentSurface}
      >
        {children}
      </div>
    </div>
  );
}
TooltipContent.displayName = "TooltipContent";

export type {
  TooltipContentProps,
  TooltipProps,
  TouchBehavior,
} from "./tooltip.types";
export { Tooltip, TooltipContent };
