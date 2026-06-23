import {
  OverlayProvider,
  Popover,
  PopoverProvider,
} from "@dev-ui/components/popover";
import { useOverlayTriggerState } from "@react-stately/overlays";
import { useRef } from "react";

type PopoverPlaygroundProps = {
  defaultOpen?: boolean;
  isNonModal?: boolean;
  placement?: "top" | "bottom";
  content?: string;
};

export default function PopoverPlayground({
  defaultOpen = true,
  isNonModal = false,
  placement = "bottom",
  content = "Popover content",
}: PopoverPlaygroundProps = {}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const state = useOverlayTriggerState({ defaultOpen });

  return (
    <OverlayProvider>
      <button ref={triggerRef} type="button">
        Trigger
      </button>
      <PopoverProvider
        value={{
          triggerRef,
          state,
          popoverRef,
          placement,
          isNonModal,
        }}
      >
        <Popover>{content}</Popover>
      </PopoverProvider>
    </OverlayProvider>
  );
}
