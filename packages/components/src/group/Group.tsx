import { cn, composeRefs } from "@dev-ui/core";
import { useFocusWithin, useHover } from "@react-aria/interactions";
import { filterDOMProps, mergeProps } from "@react-aria/utils";
import { useRef, useState } from "react";
import styles from "./group.module.scss";
import type { GroupProps, GroupTextProps } from "./group.types";

function Group({
  ref,
  orientation = "horizontal",
  isDisabled,
  isInvalid,
  className,
  children,
  ...props
}: GroupProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const { focusWithinProps } = useFocusWithin({
    onFocusWithinChange: setIsFocusWithin,
  });
  const hoverOptions = isDisabled !== undefined ? { isDisabled } : {};
  const { hoverProps, isHovered } = useHover(hoverOptions);
  const domProps = filterDOMProps(
    props as Parameters<typeof filterDOMProps>[0],
  );

  return (
    <div
      {...mergeProps(domProps, focusWithinProps, hoverProps)}
      ref={composeRefs(groupRef, ref)}
      data-slot="group"
      data-group=""
      data-orientation={orientation}
      data-disabled={isDisabled ? "true" : undefined}
      data-invalid={isInvalid ? "true" : undefined}
      data-hovered={isHovered ? "true" : undefined}
      data-focus-within={isFocusWithin ? "true" : undefined}
      className={cn(styles.root, className)}
    >
      {children}
    </div>
  );
}

function GroupText({ ref, className, ...props }: GroupTextProps) {
  return (
    <span
      ref={ref}
      data-slot="text"
      data-text=""
      className={cn(styles.text, className)}
      {...props}
    />
  );
}

export type { GroupProps, GroupTextProps } from "./group.types";
export { Group, GroupText };
