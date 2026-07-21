import { Tooltip, TooltipContent } from "@dev-ui/components/tooltip";
import type { ReactElement } from "react";

type ChatTooltipProps = {
  label: string;
  children: ReactElement;
};

export function ChatTooltip({ label, children }: ChatTooltipProps) {
  return (
    <Tooltip delay={300} touchBehavior="longPress">
      {children}
      <TooltipContent portal placement="top">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
