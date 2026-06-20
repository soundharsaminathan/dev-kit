import type { Color, ColorPickerState } from "@react-stately/color";
import { createContext, useContext } from "react";

export const ColorPickerStateContext = createContext<ColorPickerState | null>(
  null,
);

export function useColorPickerStateContext(): ColorPickerState | null {
  return useContext(ColorPickerStateContext);
}

export function useColorPickerStateContextRequired(
  component: string,
): ColorPickerState {
  const context = useContext(ColorPickerStateContext);
  if (!context) {
    throw new Error(`${component} must be used within ColorPicker`);
  }
  return context;
}

export type ColorControlledProps = {
  value?: Color | string | null;
  defaultValue?: Color | string | null;
  onChange?: (value: Color) => void;
};

export function mergeColorPickerProps<T extends ColorControlledProps>(
  props: T,
  pickerState: ColorPickerState | null,
): T {
  if (!pickerState) {
    return props;
  }

  return {
    ...props,
    value: pickerState.color,
    onChange: pickerState.setColor,
  };
}
