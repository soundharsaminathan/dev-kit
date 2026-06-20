import { cn, composeRefs } from "@dev-ui/core";
import {
  DismissButton,
  Overlay,
  OverlayProvider,
  usePopover,
} from "@react-aria/overlays";
import { mergeProps } from "@react-aria/utils";
import { createContext, useContext, useLayoutEffect, useRef } from "react";
import styles from "./popover.module.scss";
import type { PopoverContextValue, PopoverProps } from "./popover.types";

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext(component: string): PopoverContextValue {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error(
      `${component} must be used within a picker that provides PopoverContext`,
    );
  }
  return context;
}

function PopoverProvider({
  value,
  children,
}: {
  value: PopoverContextValue;
  children: React.ReactNode;
}) {
  return (
    <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
  );
}

function Popover({
  ref,
  placement: placementProp,
  offset = 8,
  className,
  children,
  ...props
}: PopoverProps) {
  const {
    triggerRef,
    state,
    popoverRef: contextPopoverRef,
    placement: contextPlacement,
    offset: contextOffset,
    isNonModal,
  } = usePopoverContext("Popover");
  const internalPopoverRef = useRef<HTMLDivElement>(null);
  const popoverRef = contextPopoverRef ?? internalPopoverRef;
  const placement = placementProp ?? contextPlacement ?? "bottom";
  const resolvedOffset = contextOffset ?? offset;

  const { popoverProps, underlayProps } = usePopover(
    {
      triggerRef,
      popoverRef,
      placement,
      offset: resolvedOffset,
      ...(isNonModal !== undefined ? { isNonModal } : {}),
    },
    state,
  );

  useLayoutEffect(() => {
    if (!state.isOpen) {
      return;
    }

    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) {
      return;
    }

    const widthElement = trigger.closest("[data-input-group]") ?? trigger;

    const syncTriggerWidth = () => {
      popover.style.setProperty(
        "--trigger-width",
        `${widthElement.getBoundingClientRect().width}px`,
      );
    };

    syncTriggerWidth();

    const observer = new ResizeObserver(syncTriggerWidth);
    observer.observe(widthElement);

    return () => {
      observer.disconnect();
    };
  }, [state.isOpen, triggerRef, popoverRef]);

  if (!state.isOpen) {
    return null;
  }

  return (
    <Overlay>
      {!isNonModal ? (
        <div {...underlayProps} className={styles.underlay} />
      ) : null}
      <div
        {...mergeProps(popoverProps, props)}
        ref={composeRefs(popoverRef, ref)}
        data-popover=""
        className={cn(styles.popover, className)}
      >
        {children}
        <DismissButton onDismiss={state.close} />
      </div>
    </Overlay>
  );
}

export type { PopoverContextValue, PopoverProps } from "./popover.types";
export { OverlayProvider, Popover, PopoverProvider };
