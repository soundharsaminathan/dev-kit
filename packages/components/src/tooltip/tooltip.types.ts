import type { Placement } from "@react-aria/overlays";
import type { AriaTooltipProps } from "@react-aria/tooltip";
import type { TooltipTriggerProps } from "@react-stately/tooltip";
import type { ReactNode, Ref } from "react";

export type TouchBehavior = "toggle" | "longPress";

export type TooltipProps = TooltipTriggerProps & {
  children?: ReactNode;
  className?: string | undefined;
  fullWidth?: boolean | undefined;
  /**
   * How the tooltip opens on touch devices without hover.
   * - `toggle`: tap the trigger to show or hide
   * - `longPress`: press and hold the trigger (keeps short taps free for buttons)
   * @default "toggle"
   */
  touchBehavior?: TouchBehavior | undefined;
};

export type TooltipContentProps = AriaTooltipProps & {
  children?: ReactNode;
  className?: string | undefined;
  placement?: Placement | undefined;
  /** Render in a portal with fixed positioning (escapes overflow clipping). */
  portal?: boolean | undefined;
  /**
   * Whether to hide the tooltip arrow.
   * @default false
   */
  hideArrow?: boolean | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type TooltipContextValue = {
  triggerProps: React.HTMLAttributes<HTMLElement>;
  tooltipProps: React.HTMLAttributes<HTMLElement>;
  state: ReturnType<
    typeof import("@react-stately/tooltip").useTooltipTriggerState
  >;
  triggerRef: React.RefObject<HTMLElement | null>;
  fullWidth: boolean;
  canHover: boolean;
};
