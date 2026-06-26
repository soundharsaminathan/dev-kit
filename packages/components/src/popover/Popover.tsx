import { cn, composeRefs } from "@dev-ui/core";
import {
  DismissButton,
  Overlay,
  OverlayProvider,
  usePopover,
} from "@react-aria/overlays";
import { mergeProps } from "@react-aria/utils";
import {
  createContext,
  type RefObject,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import styles from "./popover.module.scss";
import type { PopoverContextValue, PopoverProps } from "./popover.types";

function resolvePopoverAnchor(trigger: Element | null): Element | null {
  if (!trigger) {
    return null;
  }

  return trigger.closest("[data-input-group]") ?? trigger;
}

function usePopoverAnchorRef(
  triggerRef: RefObject<Element | null>,
): RefObject<Element | null> {
  return useMemo(
    () => ({
      get current() {
        return resolvePopoverAnchor(triggerRef.current);
      },
      set current(_value: Element | null) {
        // Positioning follows the resolved anchor; ignore external assignment.
      },
    }),
    [triggerRef],
  );
}

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
  portalContainer: portalContainerProp,
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
    portalContainer: contextPortalContainer,
  } = usePopoverContext("Popover");
  const portalContainer = portalContainerProp ?? contextPortalContainer;
  const internalPopoverRef = useRef<HTMLDivElement>(null);
  const popoverRef = contextPopoverRef ?? internalPopoverRef;
  const placement = placementProp ?? contextPlacement ?? "bottom";
  const resolvedOffset = contextOffset ?? offset;
  const anchorRef = usePopoverAnchorRef(triggerRef);

  const { popoverProps, underlayProps } = usePopover(
    {
      triggerRef: anchorRef,
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

    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) {
      return;
    }

    const syncTriggerWidth = () => {
      popover.style.setProperty(
        "--trigger-width",
        `${anchor.getBoundingClientRect().width}px`,
      );
    };

    syncTriggerWidth();

    const observer = new ResizeObserver(syncTriggerWidth);
    observer.observe(anchor);

    return () => {
      observer.disconnect();
    };
  }, [state.isOpen, anchorRef, popoverRef]);

  if (!state.isOpen) {
    return null;
  }

  return (
    <Overlay {...(portalContainer != null ? { portalContainer } : {})}>
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
