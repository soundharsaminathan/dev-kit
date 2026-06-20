import { cn, composeRefs } from "@dev-ui/core";
import { useToggleButton, useToggleButtonGroupItem } from "@react-aria/button";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import { mergeProps } from "@react-aria/utils";
import { useToggleState } from "@react-stately/toggle";
import { useContext, useRef } from "react";
import { ToggleButtonGroupContext } from "../toggle-button-group/toggle-button-group-context";
import styles from "./toggle-button.module.scss";
import type { ToggleButtonProps } from "./toggle-button.types";

function renderChildren(children: React.ReactNode) {
  if (typeof children === "string") {
    return <span className={styles.label}>{children}</span>;
  }
  return children;
}

function ToggleButtonStandalone({
  ref,
  variant = "default",
  size = "md",
  isIconOnly,
  children,
  isDisabled,
  className,
  ...props
}: ToggleButtonProps) {
  const domRef = useRef<HTMLButtonElement>(null);
  const state = useToggleState(props);
  const disabled = Boolean(isDisabled);
  const { buttonProps, isPressed, isSelected } = useToggleButton(
    { ...props, isDisabled: disabled },
    state,
    domRef,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <button
      {...mergeProps(buttonProps, hoverProps, focusProps)}
      ref={composeRefs(domRef, ref)}
      type="button"
      data-button=""
      data-toggle-button=""
      data-variant={variant}
      data-size={size}
      data-icon-only={isIconOnly ? "true" : undefined}
      data-selected={isSelected ? "true" : undefined}
      data-pressed={isPressed ? "true" : undefined}
      data-hovered={isHovered ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={cn(styles.root, className)}
    >
      {renderChildren(children)}
    </button>
  );
}

function ToggleButtonInGroup({
  ref,
  id,
  children,
  isDisabled,
  className,
  ...props
}: ToggleButtonProps) {
  const groupContext = useContext(ToggleButtonGroupContext);
  const domRef = useRef<HTMLButtonElement>(null);
  const disabled = Boolean(isDisabled);
  const { buttonProps, isPressed, isSelected } = useToggleButtonGroupItem(
    {
      ...props,
      id: id as string,
      isDisabled: disabled,
    },
    groupContext!.state,
    domRef,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <button
      {...mergeProps(buttonProps, hoverProps, focusProps)}
      ref={composeRefs(domRef, ref)}
      type="button"
      data-button=""
      data-toggle-button=""
      data-variant={groupContext!.variant}
      data-size={groupContext!.size}
      data-icon-only={groupContext!.isIconOnly ? "true" : undefined}
      data-selected={isSelected ? "true" : undefined}
      data-pressed={isPressed ? "true" : undefined}
      data-hovered={isHovered ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={cn(styles.root, className)}
    >
      {renderChildren(children)}
    </button>
  );
}

function ToggleButton(props: ToggleButtonProps) {
  const groupContext = useContext(ToggleButtonGroupContext);
  if (groupContext) {
    return <ToggleButtonInGroup {...props} />;
  }
  return <ToggleButtonStandalone {...props} />;
}

export type {
  ToggleButtonProps,
  ToggleButtonSize,
  ToggleButtonVariant,
} from "./toggle-button.types";
export { ToggleButton };
