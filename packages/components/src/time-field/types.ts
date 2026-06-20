import type { AriaTimeFieldProps } from "@react-aria/datepicker";
import type { TimeFieldState, TimeValue } from "@react-stately/datepicker";
import type { DOMAttributes, ReactNode, Ref } from "react";

export type TimeFieldProps<T extends TimeValue = TimeValue> =
  AriaTimeFieldProps<T> & {
    className?: string | undefined;
    children?: ReactNode | undefined;
    ref?: Ref<HTMLDivElement>;
  };

export type TimeFieldContextValue = {
  state: TimeFieldState;
  fieldRef: React.RefObject<HTMLDivElement | null>;
  fieldProps: DOMAttributes<HTMLElement>;
  labelProps: DOMAttributes<HTMLElement>;
  descriptionProps: DOMAttributes<HTMLElement>;
  errorMessageProps: DOMAttributes<HTMLElement>;
  isDisabled: boolean;
  isInvalid: boolean;
};
