import { cn, composeRefs } from "@dev-ui/core";
import { useToggleButtonGroup } from "@react-aria/button";
import { useToggleGroupState } from "@react-stately/toggle";
import { useContext, useMemo, useRef } from "react";
import styles from "./toggle-button-group.module.scss";
import type {
  ToggleButtonGroupContextValue,
  ToggleButtonGroupProps,
} from "./toggle-button-group.types";
import { ToggleButtonGroupContext } from "./toggle-button-group-context";

export function useToggleButtonGroupContext(
  component: string,
): ToggleButtonGroupContextValue {
  const context = useContext(ToggleButtonGroupContext);
  if (!context) {
    throw new Error(`${component} must be used within ToggleButtonGroup`);
  }
  return context;
}

function ToggleButtonGroup({
  children,
  className,
  variant = "default",
  size = "md",
  isIconOnly = false,
  orientation = "horizontal",
  ref,
  ...props
}: ToggleButtonGroupProps) {
  const state = useToggleGroupState(props);
  const groupRef = useRef<HTMLDivElement>(null);
  const { groupProps } = useToggleButtonGroup(props, state, groupRef);

  const contextValue = useMemo(
    () => ({
      state,
      variant,
      size,
      isIconOnly: Boolean(isIconOnly),
    }),
    [state, variant, size, isIconOnly],
  );

  return (
    <ToggleButtonGroupContext.Provider value={contextValue}>
      <div
        {...groupProps}
        ref={composeRefs(groupRef, ref)}
        data-toggle-button-group=""
        data-orientation={orientation}
        className={cn(styles.root, className)}
      >
        {children}
      </div>
    </ToggleButtonGroupContext.Provider>
  );
}

export type { ToggleButtonGroupProps } from "./toggle-button-group.types";
export { ToggleButtonGroup };
