import type { DOMAttributes } from "@react-types/shared";
import type { InputHTMLAttributes, RefObject } from "react";
import { createContext, useContext } from "react";

export type ColorFieldContextValue = {
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  inputRef: RefObject<HTMLInputElement | null>;
  labelProps: DOMAttributes<HTMLElement>;
  descriptionProps: DOMAttributes<HTMLElement>;
  errorMessageProps: DOMAttributes<HTMLElement>;
  isDisabled: boolean;
  isInvalid: boolean;
};

export const ColorFieldContext = createContext<ColorFieldContextValue | null>(
  null,
);

export function useColorFieldContext(
  component: string,
): ColorFieldContextValue {
  const context = useContext(ColorFieldContext);
  if (!context) {
    throw new Error(`${component} must be used within ColorField`);
  }
  return context;
}
