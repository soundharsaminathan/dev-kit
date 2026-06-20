import type { AriaToggleButtonGroupProps } from "@react-aria/button";
import type { ToggleGroupState } from "@react-stately/toggle";
import type { ReactNode, Ref } from "react";
import type {
  ToggleButtonSize,
  ToggleButtonVariant,
} from "../toggle-button/toggle-button.types";

export type ToggleButtonGroupProps = AriaToggleButtonGroupProps & {
  variant?: ToggleButtonVariant | undefined;
  size?: ToggleButtonSize | undefined;
  isIconOnly?: boolean | undefined;
  orientation?: "horizontal" | "vertical" | undefined;
  children?: ReactNode;
  className?: string | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type ToggleButtonGroupContextValue = {
  state: ToggleGroupState;
  variant: ToggleButtonVariant;
  size: ToggleButtonSize;
  isIconOnly: boolean;
};
