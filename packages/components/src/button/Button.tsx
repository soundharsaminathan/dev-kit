import { cn, composeRefs } from "@dev-ui/core";
import { useButton } from "@react-aria/button";
import { useHover } from "@react-aria/interactions";
import { filterDOMProps, mergeProps } from "@react-aria/utils";
import { type HTMLMotionProps, motion, useReducedMotion } from "motion/react";
import { type ElementType, useLayoutEffect, useRef, useState } from "react";
import { useHoverCapable } from "../hooks/use-hover-capable";
import { SPRING_PRESS } from "../motion/ease";
import styles from "./button.module.scss";
import type { ButtonProps } from "./button.types";

function readCssNumber(element: HTMLElement, name: string) {
  const value = Number.parseFloat(
    getComputedStyle(element).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : undefined;
}

function useButtonMotionScales(
  ref: React.RefObject<HTMLButtonElement | null>,
  enabled: boolean,
) {
  const [scales, setScales] = useState<{
    hover: number;
    press: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setScales(null);
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const hover = readCssNumber(element, "--btn-hover-scale");
    const press = readCssNumber(element, "--btn-press-scale");

    if (hover !== undefined && press !== undefined) {
      setScales({ hover, press });
    }
  }, [enabled, ref]);

  return scales;
}

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
  const reducedMotion = useReducedMotion();
  const canHover = useHoverCapable();

  const disabled = Boolean(rest.disabled ?? isDisabled);
  const useMotionPress =
    isNativeButton &&
    variant !== "link" &&
    !disabled &&
    !isPending &&
    !reducedMotion;
  const motionScales = useButtonMotionScales(domRef, useMotionPress);

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
    "data-motion-press": useMotionPress ? "true" : undefined,
    "aria-busy": isPending ? true : undefined,
  };

  const motionPressProps =
    useMotionPress && motionScales
      ? {
          whileTap: { scale: motionScales.press },
          whileHover: canHover ? { scale: motionScales.hover } : undefined,
          transition: SPRING_PRESS,
        }
      : {};

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
          motionPressProps,
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
