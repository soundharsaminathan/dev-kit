import type { ColorPickerProps } from "@react-stately/color";
import type { ReactNode } from "react";

export type ColorSwatchPickerProps = ColorPickerProps & {
  className?: string;
  children?: ReactNode;
  isDisabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export type ColorSwatchPickerItemProps =
  React.ComponentPropsWithoutRef<"div"> & {
    color: string;
  };
