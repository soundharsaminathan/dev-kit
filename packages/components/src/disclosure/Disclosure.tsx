import { cn, composeRefs } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { useButton } from "@react-aria/button";
import { useDisclosure } from "@react-aria/disclosure";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import { useDisclosureState } from "@react-stately/disclosure";
import { createContext, useContext, useMemo, useRef } from "react";
import { AccordionContext } from "../accordion/accordion-context";
import styles from "./disclosure.module.scss";
import type {
  DisclosureContextValue,
  DisclosurePanelMountWhen,
  DisclosurePanelProps,
  DisclosureProps,
  DisclosureTriggerProps,
} from "./disclosure.types";

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

function useDisclosureContext(component: string): DisclosureContextValue {
  const context = useContext(DisclosureContext);
  if (!context) {
    throw new Error(`${component} must be used within Disclosure`);
  }
  return context;
}

function Disclosure({
  children,
  className,
  id,
  isDisabled,
  onExpandedChange,
  ...props
}: DisclosureProps) {
  const accordionContext = useContext(AccordionContext);
  const isInAccordion = accordionContext != null && id != null;
  const disabled = Boolean(isDisabled || accordionContext?.isDisabled);

  const state = useDisclosureState({
    ...props,
    ...(isInAccordion
      ? {
          isExpanded: accordionContext.expandedKeys.has(id),
          onExpandedChange(expanded) {
            accordionContext.toggleKey(id);
            onExpandedChange?.(expanded);
          },
        }
      : {
          ...(onExpandedChange !== undefined ? { onExpandedChange } : {}),
        }),
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const { buttonProps: triggerProps, panelProps } = useDisclosure(
    { ...props, isDisabled: disabled },
    state,
    panelRef,
  );

  const contextValue = useMemo(
    () => ({
      state,
      triggerProps,
      panelProps,
      panelRef,
    }),
    [state, triggerProps, panelProps],
  );

  return (
    <DisclosureContext.Provider value={contextValue}>
      <div
        data-disclosure=""
        data-expanded={state.isExpanded ? "true" : undefined}
        className={cn(styles.root, className)}
      >
        {children}
      </div>
    </DisclosureContext.Provider>
  );
}

function DisclosureTrigger({
  children,
  className,
  ref,
  ...props
}: DisclosureTriggerProps) {
  const { triggerProps } = useDisclosureContext("DisclosureTrigger");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(
    triggerProps as Parameters<typeof useButton>[0],
    triggerRef,
  );
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <h3 className={styles.heading}>
      <button
        {...mergeProps(buttonProps, focusProps, props)}
        ref={composeRefs(triggerRef, ref)}
        type="button"
        data-disclosure-trigger=""
        data-focus-visible={isFocusVisible ? "true" : undefined}
        data-disabled={
          (buttonProps as { disabled?: boolean }).disabled ? "true" : undefined
        }
        className={cn(styles.trigger, className)}
      >
        {children}
        <Icon name="chevron-down" className={styles.chevron} />
      </button>
    </h3>
  );
}
DisclosureTrigger.displayName = "DisclosureTrigger";

function shouldMountPanelChildren(
  mountWhen: DisclosurePanelMountWhen,
  isExpanded: boolean,
  hasMounted: boolean,
): boolean {
  switch (mountWhen) {
    case "expanded":
      return isExpanded;
    case "expanded-once":
      return isExpanded || hasMounted;
    default:
      return true;
  }
}

function DisclosurePanel({
  children,
  className,
  mountWhen = "always",
  ref,
  ...props
}: DisclosurePanelProps) {
  const { panelProps, panelRef, state } =
    useDisclosureContext("DisclosurePanel");
  const hasMountedRef = useRef(state.isExpanded);

  if (state.isExpanded) {
    hasMountedRef.current = true;
  }

  const shouldMountChildren = shouldMountPanelChildren(
    mountWhen,
    state.isExpanded,
    hasMountedRef.current,
  );

  return (
    <div
      {...mergeProps(panelProps, props)}
      ref={composeRefs(panelRef, ref)}
      data-disclosure-panel=""
      data-hidden={state.isExpanded ? undefined : "true"}
      className={cn(styles.panel, className)}
    >
      <div className={styles.panelInner}>
        {shouldMountChildren ? children : null}
      </div>
    </div>
  );
}
DisclosurePanel.displayName = "DisclosurePanel";

export type {
  DisclosurePanelProps,
  DisclosureProps,
  DisclosureTriggerProps,
} from "./disclosure.types";
export { Disclosure, DisclosurePanel, DisclosureTrigger };
