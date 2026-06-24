import { Button } from "@dev-ui/components/button";
import { Tooltip, TooltipContent } from "@dev-ui/components/tooltip";
import type React from "react";

type TooltipPlaygroundProps = {
  triggerLabel?: string;
  content?: string;
  placement?: "top" | "bottom" | "left" | "right";
  fullWidth?: boolean;
  touchBehavior?: "toggle" | "longPress";
  delay?: number;
  closeDelay?: number;
};

const TooltipContentWithPlacement = TooltipContent as React.FC<{
  placement?: TooltipPlaygroundProps["placement"];
  children?: React.ReactNode;
}>;

export default function TooltipPlayground({
  triggerLabel = "Hover or tap me",
  content = "Add to library",
  placement = "bottom",
  fullWidth = true,
  touchBehavior = "toggle",
  delay = 0,
  closeDelay = 0,
}: TooltipPlaygroundProps = {}) {
  return (
    <div style={{ width: fullWidth ? 280 : undefined }}>
      <Tooltip
        fullWidth={fullWidth}
        touchBehavior={touchBehavior}
        delay={delay}
        closeDelay={closeDelay}
      >
        <Button>{triggerLabel}</Button>
        <TooltipContentWithPlacement placement={placement}>
          {content}
        </TooltipContentWithPlacement>
      </Tooltip>
    </div>
  );
}
