import type { ColorPickerProps as StatelyColorPickerProps } from "@react-stately/color";
import type { ReactNode } from "react";
import type { DialogProps } from "../dialog/dialog.types";

export type ColorPickerProps = StatelyColorPickerProps &
  Omit<DialogProps, "children"> & {
    className?: string;
    children?: ReactNode;
  };
