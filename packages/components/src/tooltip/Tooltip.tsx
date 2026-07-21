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

function getPortalStyle(placement: Placement, rect: DOMRect): CSSProperties {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  if (placement === "right" || placement.startsWith("right")) {
    return {
      position: "fixed",
      top: centerY,
      left: rect.right + TOOLTIP_GAP,
      transform: "translateY(-50%)",
    };
  }

  if (placement === "left" || placement.startsWith("left")) {
    return {
      position: "fixed",
      top: centerY,
      left: rect.left - TOOLTIP_GAP,
      transform: "translate(-100%, -50%)",
    };
  }

  if (placement === "top" || placement.startsWith("top")) {
    return {
      position: "fixed",
      top: rect.top - TOOLTIP_GAP,
      left: centerX,
      transform: "translate(-50%, -100%)",
    };
  }

  return {
    position: "fixed",
    top: rect.bottom + TOOLTIP_GAP,
    left: centerX,
    transform: "translateX(-50%)",
  };
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
    if (!state.isOpen || !portal) {
      setPortalStyle(undefined);
      return;
    }

    const syncPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      setPortalStyle(
        getPortalStyle(placement, trigger.getBoundingClientRect()),
      );
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

  if (portal && !portalStyle) {
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
