import type { DOMAttributes } from "@react-types/shared";
import type { InputHTMLAttributes, RefObject } from "react";
import { createContext, useContext } from "react";

export type ColorThumbContextValue = {
  thumbProps: DOMAttributes<HTMLElement>;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  xInputProps?: InputHTMLAttributes<HTMLInputElement>;
  yInputProps?: InputHTMLAttributes<HTMLInputElement>;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputXRef?: RefObject<HTMLInputElement | null>;
  inputYRef?: RefObject<HTMLInputElement | null>;
  isDisabled?: boolean;
  thumbColor?: string | undefined;
  orientation?: "horizontal" | "vertical";
};

export const ColorThumbContext = createContext<ColorThumbContextValue | null>(
  null,
);

export function useColorThumbContext(
  component: string,
): ColorThumbContextValue {
  const context = useContext(ColorThumbContext);
  if (!context) {
    throw new Error(
      `${component} must be used within ColorArea or ColorSlider`,
    );
  }
  return context;
}
