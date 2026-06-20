import type { AriaNumberFieldProps } from "@react-aria/numberfield";
import type { NumberFieldState } from "@react-stately/numberfield";
import type { DOMAttributes, ReactNode, Ref, RefObject } from "react";
import type { InputSize } from "../input/input.types";

export type NumberFieldProps = AriaNumberFieldProps & {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

export type NumberFieldGroupProps = DOMAttributes<HTMLElement> & {
  className?: string;
  children?: ReactNode;
};

export type NumberFieldInputProps = {
  className?: string;
  size?: InputSize | undefined;
  ref?: Ref<HTMLInputElement>;
};

export type NumberFieldButtonProps = {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export type NumberFieldContextValue = {
  state: NumberFieldState;
  inputRef: RefObject<HTMLInputElement | null>;
  groupProps: DOMAttributes<HTMLElement>;
  inputProps: DOMAttributes<HTMLInputElement>;
  incrementButtonProps: DOMAttributes<HTMLButtonElement>;
  decrementButtonProps: DOMAttributes<HTMLButtonElement>;
  isDisabled: boolean;
  isInvalid: boolean;
};
