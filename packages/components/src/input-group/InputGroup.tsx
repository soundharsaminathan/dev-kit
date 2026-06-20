import { cn, composeRefs } from "@dev-ui/core";
import { useFocusWithin, useHover } from "@react-aria/interactions";
import { filterDOMProps, mergeProps } from "@react-aria/utils";
import { type PointerEvent, type TouchEvent, useRef, useState } from "react";
import styles from "./input-group.module.scss";
import type {
  InputGroupAddonProps,
  InputGroupProps,
} from "./input-group.types";

const INTERACTIVE_SELECTOR = "button,input,textarea,[role='button']";

function focusInnerInput(group: HTMLElement) {
  (group.querySelector("input, textarea") as HTMLElement | null)?.focus();
}

function InputGroup({
  ref,
  size = "md",
  isDisabled,
  isInvalid,
  className,
  onPointerDown,
  onTouchEnd,
  children,
  ...props
}: InputGroupProps) {
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
      {...mergeProps(domProps, focusWithinProps, hoverProps, {
        onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
          onPointerDown?.(event);
          if (event.defaultPrevented || event.pointerType !== "mouse") {
            return;
          }
          const target = event.target as Element;
          if (target.closest(INTERACTIVE_SELECTOR)) {
            return;
          }
          event.preventDefault();
          focusInnerInput(event.currentTarget);
        },
        onTouchEnd: (event: TouchEvent<HTMLDivElement>) => {
          onTouchEnd?.(event);
          if (event.defaultPrevented) {
            return;
          }
          const target = event.target as HTMLElement;
          if (
            target.isContentEditable ||
            target.closest(INTERACTIVE_SELECTOR)
          ) {
            return;
          }
          event.preventDefault();
          focusInnerInput(event.currentTarget);
        },
      })}
      ref={composeRefs(groupRef, ref)}
      data-input-group=""
      data-size={size}
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

function InputGroupAddon({ ref, className, ...props }: InputGroupAddonProps) {
  return (
    <div
      ref={ref}
      data-input-group-addon=""
      className={cn(styles.addon, className)}
      {...props}
    />
  );
}

export type {
  InputGroupAddonProps,
  InputGroupProps,
} from "./input-group.types";
export { InputGroup, InputGroupAddon };
