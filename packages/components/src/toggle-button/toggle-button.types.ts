import type { AriaToggleButtonProps } from "@react-aria/button";
import type { ReactNode, Ref } from "react";

export type ToggleButtonVariant = "default" | "primary" | "quiet";
export type ToggleButtonSize = "xs" | "sm" | "md" | "lg";

export type ToggleButtonProps = AriaToggleButtonProps & {
  id?: string | undefined;
  variant?: ToggleButtonVariant | undefined;
  size?: ToggleButtonSize | undefined;
  isIconOnly?: boolean | undefined;
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
};
