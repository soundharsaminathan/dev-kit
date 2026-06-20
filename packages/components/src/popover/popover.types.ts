import type { Placement } from "@react-aria/overlays";
import type { OverlayTriggerState } from "@react-stately/overlays";
import type { HTMLAttributes, Ref, RefObject } from "react";

export type PopoverProps = HTMLAttributes<HTMLDivElement> & {
  placement?: Placement | undefined;
  offset?: number | undefined;
  className?: string | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type PopoverContextValue = {
  triggerRef: RefObject<Element | null>;
  state: OverlayTriggerState;
  popoverRef?: RefObject<HTMLDivElement | null> | undefined;
  placement?: Placement | undefined;
  offset?: number | undefined;
  isNonModal?: boolean | undefined;
};
