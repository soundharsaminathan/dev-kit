import { cn, composeRefs } from "@dev-ui/core";
import { useCanHover } from "@dev-ui/hooks";
import { useInteractOutside } from "@react-aria/interactions";
import { OverlayContainer, type Placement } from "@react-aria/overlays";
import { useTooltip, useTooltipTrigger } from "@react-aria/tooltip";
import { mergeProps } from "@react-aria/utils";
import { useTooltipTriggerState } from "@react-stately/tooltip";
import {
  Children,
  type CSSProperties,
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { findChildByDisplayName } from "../list-box/collection-utils";
import styles from "./tooltip.module.scss";
import type {
  TooltipContentProps,
  TooltipContextValue,
  TooltipProps,
} from "./tooltip.types";
import { useTouchTooltipTriggerProps } from "./use-touch-tooltip-trigger";

const TOOLTIP_GAP = 8;
const VIEWPORT_PADDING = 8;

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext(component: string): TooltipContextValue {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error(`${component} must be used within Tooltip`);
  }
  return context;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function getClampedOrigin(
  preferredLeft: number,
  preferredTop: number,
  width: number,
  height: number,
): { left: number; top: number } {
  const maxLeft = Math.max(
    VIEWPORT_PADDING,
    window.innerWidth - VIEWPORT_PADDING - width,
  );
  const maxTop = Math.max(
    VIEWPORT_PADDING,
    window.innerHeight - VIEWPORT_PADDING - height,
  );

  return {
    left: clamp(preferredLeft, VIEWPORT_PADDING, maxLeft),
    top: clamp(preferredTop, VIEWPORT_PADDING, maxTop),
  };
}

function getPortalStyle(
  placement: Placement,
  triggerRect: DOMRect,
  tooltipSize: { width: number; height: number },
): CSSProperties {
  const { width, height } = tooltipSize;
  const centerX = triggerRect.left + triggerRect.width / 2;
  const centerY = triggerRect.top + triggerRect.height / 2;

  let preferredLeft: number;
  let preferredTop: number;

  if (placement === "right" || placement.startsWith("right")) {
    preferredLeft = triggerRect.right + TOOLTIP_GAP;
    preferredTop = centerY - height / 2;
  } else if (placement === "left" || placement.startsWith("left")) {
    preferredLeft = triggerRect.left - TOOLTIP_GAP - width;
    preferredTop = centerY - height / 2;
  } else if (placement === "top" || placement.startsWith("top")) {
    preferredLeft = centerX - width / 2;
    preferredTop = triggerRect.top - TOOLTIP_GAP - height;
  } else {
    preferredLeft = centerX - width / 2;
    preferredTop = triggerRect.bottom + TOOLTIP_GAP;
  }

  const { left, top } = getClampedOrigin(
    preferredLeft,
    preferredTop,
    width,
    height,
  );

  return {
    position: "fixed",
    top,
    left,
    transform: "none",
  };
}

function syncInlineViewportShift(tooltip: HTMLElement) {
  tooltip.style.setProperty("--tooltip-shift-x", "0px");
  tooltip.style.setProperty("--tooltip-shift-y", "0px");

  const rect = tooltip.getBoundingClientRect();
  const maxRight = window.innerWidth - VIEWPORT_PADDING;
  const maxBottom = window.innerHeight - VIEWPORT_PADDING;

  let shiftX = 0;
  let shiftY = 0;

  if (rect.left < VIEWPORT_PADDING) {
    shiftX = VIEWPORT_PADDING - rect.left;
  } else if (rect.right > maxRight) {
    shiftX = maxRight - rect.right;
  }

  if (rect.top < VIEWPORT_PADDING) {
    shiftY = VIEWPORT_PADDING - rect.top;
  } else if (rect.bottom > maxBottom) {
    shiftY = maxBottom - rect.bottom;
  }

  tooltip.style.setProperty("--tooltip-shift-x", `${shiftX}px`);
  tooltip.style.setProperty("--tooltip-shift-y", `${shiftY}px`);
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

function TooltipContent({
  children,
  className,
  placement = "bottom",
  portal = false,
  ref,
  ...props
}: TooltipContentProps) {
  const { state, tooltipProps, triggerRef, fullWidth, canHover } =
    useTooltipContext("TooltipContent");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [portalStyle, setPortalStyle] = useState<CSSProperties>();
  const { tooltipProps: overlayTooltipProps } = useTooltip(
    mergeProps(tooltipProps, props) as Parameters<typeof useTooltip>[0],
    state,
  );

  useInteractOutside({
    ref: tooltipRef,
    onInteractOutside: () => {
      state.close(true);
    },
    isDisabled: !state.isOpen || canHover,
  });

  useLayoutEffect(() => {
    if (!state.isOpen || !fullWidth || portal) {
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
  }, [state.isOpen, fullWidth, portal, triggerRef]);

  useLayoutEffect(() => {
    if (!state.isOpen || portal) {
      return;
    }

    const tooltip = tooltipRef.current;
    if (!tooltip) {
      return;
    }

    const syncShift = () => {
      syncInlineViewportShift(tooltip);
    };

    syncShift();
    window.addEventListener("scroll", syncShift, true);
    window.addEventListener("resize", syncShift);

    return () => {
      window.removeEventListener("scroll", syncShift, true);
      window.removeEventListener("resize", syncShift);
      tooltip.style.removeProperty("--tooltip-shift-x");
      tooltip.style.removeProperty("--tooltip-shift-y");
    };
  }, [state.isOpen, portal, placement]);

  useLayoutEffect(() => {
    if (!state.isOpen || !portal) {
      setPortalStyle(undefined);
      return;
    }

    const syncPosition = () => {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const tooltipSize = tooltip
        ? {
            width: tooltip.offsetWidth,
            height: tooltip.offsetHeight,
          }
        : { width: 0, height: 0 };

      setPortalStyle(getPortalStyle(placement, triggerRect, tooltipSize));
    };

    syncPosition();
    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);

    return () => {
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("resize", syncPosition);
    };
  }, [state.isOpen, portal, placement, triggerRef]);

  if (!state.isOpen) {
    return null;
  }

  const content = (
    <div
      {...mergeProps(overlayTooltipProps, props)}
      ref={composeRefs(tooltipRef, ref)}
      data-tooltip-content=""
      data-placement={placement}
      data-portal={portal ? "true" : undefined}
      data-match-trigger-width={fullWidth && !portal ? "true" : undefined}
      role="tooltip"
      className={cn(styles.content, className)}
      style={portal ? portalStyle : undefined}
    >
      {children}
    </div>
  );

  if (portal) {
    return <OverlayContainer>{content}</OverlayContainer>;
  }

  return content;
}
TooltipContent.displayName = "TooltipContent";

export type {
  TooltipContentProps,
  TooltipProps,
  TouchBehavior,
} from "./tooltip.types";
export { Tooltip, TooltipContent };
