import type { AriaSearchFieldProps } from "@react-aria/searchfield";
import type { SearchFieldState } from "@react-stately/searchfield";
import type { DOMAttributes, ReactNode, Ref, RefObject } from "react";

export type SearchFieldProps = AriaSearchFieldProps & {
  className?: string;
  children?: ReactNode;
  placeholder?: string | undefined;
};

export type SearchFieldGroupProps = {
  className?: string;
  children?: ReactNode;
};

export type SearchFieldInputProps = {
  className?: string;
  placeholder?: string | undefined;
  ref?: Ref<HTMLInputElement>;
};

export type SearchFieldClearProps = {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export type SearchFieldContextValue = {
  state: SearchFieldState;
  inputRef: RefObject<HTMLInputElement | null>;
  inputProps: DOMAttributes<HTMLInputElement>;
  clearButtonProps: DOMAttributes<HTMLButtonElement>;
  isDisabled: boolean;
};
