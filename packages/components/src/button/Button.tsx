import { cn, composeRefs } from "@dev-ui/core";
import { useButton } from "@react-aria/button";
import { useHover } from "@react-aria/interactions";
import { filterDOMProps, mergeProps } from "@react-aria/utils";
import { type HTMLMotionProps, motion } from "motion/react";
import { type ElementType, useRef } from "react";
import { usePressAnimation } from "../motion/use-press-animation";
import styles from "./button.module.scss";
import type { ButtonProps } from "./button.types";

function renderChildren(children: React.ReactNode) {
  if (typeof children === "string") {
    return <span className={styles.label}>{children}</span>;
  }
  return children;
}

function Button<C extends ElementType = "button">({
  as,
  ref,
  variant = "default",
  size = "md",
  isIconOnly,
  isPending,
  children,
  isDisabled,
  className,
  ...rest
}: ButtonProps<C>) {
  const isNativeButton = as === undefined || as === "button";
  const domRef = useRef<HTMLButtonElement>(null);
  const fallbackRef = useRef<HTMLButtonElement>(null);
  const refForHook = isNativeButton ? domRef : fallbackRef;

  const disabled = Boolean(rest.disabled ?? isDisabled);
  const useMotionPress =
    isNativeButton && variant !== "link" && !disabled && !isPending;
  const { enabled: motionPressEnabled, motionProps } = usePressAnimation(
    domRef,
    { enabled: useMotionPress },
  );

  const { buttonProps, isPressed } = useButton(
    {
      isDisabled: disabled,
      elementType: "button",
      ...rest,
    } as Parameters<typeof useButton>[0],
    refForHook,
  );

  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const {
    onClick: _onClick,
    onPointerDown: _onPointerDown,
    onPointerUp: _onPointerUp,
    onMouseDown: _onMouseDown,
    ...domProps
  } = filterDOMProps(rest, { global: true });

  const Component = as ?? "button";
  const sharedProps = {
    className: cn(styles.root, className),
    "data-variant": variant,
    "data-size": size,
    "data-icon-only": isIconOnly ? "true" : undefined,
    "data-pending": isPending ? "true" : undefined,
    "data-state": disabled ? "disabled" : undefined,
    "data-hovered": isHovered ? "true" : undefined,
    "data-motion-press": motionPressEnabled ? "true" : undefined,
    "aria-busy": isPending ? true : undefined,
  };

  const content = (
    <>
      {isPending ? (
        <span
          data-slot="spinner"
          className={styles.spinner}
          aria-hidden="true"
        />
      ) : null}
      {renderChildren(children)}
    </>
  );

  if (isNativeButton) {
    return (
      <motion.button
        {...(mergeProps(
          buttonProps,
          hoverProps,
          domProps,
          motionProps,
        ) as unknown as HTMLMotionProps<"button">)}
        ref={composeRefs(
          domRef,
          (
            buttonProps as React.ButtonHTMLAttributes<HTMLButtonElement> & {
              ref?: React.Ref<HTMLButtonElement>;
            }
          ).ref,
          ref as React.Ref<HTMLButtonElement>,
        )}
        {...sharedProps}
        data-pressed={isPressed ? "true" : undefined}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <Component
      ref={ref}
      {...hoverProps}
      {...sharedProps}
      aria-disabled={disabled}
      {...rest}
    >
      {content}
    </Component>
  );
}

export type { ButtonProps };
export { Button };
