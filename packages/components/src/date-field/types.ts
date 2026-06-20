import type { AriaDateFieldProps } from "@react-aria/datepicker";
import type { DateFieldState, DateValue } from "@react-stately/datepicker";
import type { DOMAttributes, ReactNode, Ref } from "react";

export type DateFieldProps<T extends DateValue = DateValue> =
  AriaDateFieldProps<T> & {
    className?: string | undefined;
    children?: ReactNode | undefined;
    ref?: Ref<HTMLDivElement>;
  };

export type DateFieldContextValue = {
  state: DateFieldState;
  fieldRef: React.RefObject<HTMLDivElement | null>;
  fieldProps: DOMAttributes<HTMLElement>;
  labelProps: DOMAttributes<HTMLElement>;
  descriptionProps: DOMAttributes<HTMLElement>;
  errorMessageProps: DOMAttributes<HTMLElement>;
  isDisabled: boolean;
  isInvalid: boolean;
};
