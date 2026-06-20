import type { HTMLAttributes, ReactNode, Ref } from "react";

export type OTPFieldProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> & {
  length: number;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  name?: string | undefined;
  isDisabled?: boolean | undefined;
  isInvalid?: boolean | undefined;
  isReadOnly?: boolean | undefined;
  isRequired?: boolean | undefined;
  className?: string | undefined;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

export type OTPFieldSeparatorProps = HTMLAttributes<HTMLSpanElement> & {
  ref?: Ref<HTMLSpanElement>;
};

export type OTPFieldContextValue = {
  length: number;
  value: string;
  setValue: (value: string) => void;
  getNextCellIndex: () => number;
  setCellRef: (index: number, element: HTMLInputElement | null) => void;
  focusCell: (index: number) => void;
  isDisabled: boolean;
  isReadOnly: boolean;
  isInvalid: boolean;
  isRequired: boolean;
};
