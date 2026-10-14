import type { PolymorphicPropsWithRef } from "@dev-ui/core";
import type { ElementType } from "react";

export type ButtonVariant =
  | "default"
  | "primary"
  | "quiet"
  | "outline"
  | "link"
  | "warning"
  | "danger";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

export type ButtonOwnProps = {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Square icon-only button; use with an `aria-label`. */
  isIconOnly?: boolean | undefined;
  /** Shows a loading spinner and pending styles. */
  isPending?: boolean | undefined;
  /** Disables the button (React Aria convention; same as disabled) */
  isDisabled?: boolean | undefined;
  /** When true, pressing the button does not move focus to it (keeps soft keyboards open). */
  preventFocusOnPress?: boolean | undefined;
};

export type ButtonProps<C extends ElementType = "button"> =
  PolymorphicPropsWithRef<C, ButtonOwnProps>;
