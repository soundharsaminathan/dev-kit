import { cn, composeRefs } from "@dev-ui/core";
import { useCheckboxGroup } from "@react-aria/checkbox";
import { useCheckboxGroupState } from "@react-stately/checkbox";
import { useRef } from "react";
import styles from "./checkbox-group.module.scss";
import type { CheckboxGroupProps } from "./checkbox-group.types";
import { CheckboxGroupContext } from "./checkbox-group-context";

function CheckboxGroup({
  ref,
  children,
  className,
  ...props
}: CheckboxGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const state = useCheckboxGroupState(props);
  const { groupProps } = useCheckboxGroup(props, state);

  return (
    <CheckboxGroupContext.Provider value={state}>
      <div
        {...groupProps}
        ref={composeRefs(groupRef, ref)}
        data-checkbox-group=""
        className={cn(styles.group, className)}
      >
        {children}
      </div>
    </CheckboxGroupContext.Provider>
  );
}

export type { CheckboxGroupProps } from "./checkbox-group.types";
export { CheckboxGroup };
