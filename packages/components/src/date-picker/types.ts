import type { AriaButtonProps } from "@react-aria/button";
import type { AriaRangeCalendarProps } from "@react-aria/calendar";
import type {
  AriaDatePickerProps,
  AriaDateRangePickerProps,
} from "@react-aria/datepicker";
import type { AriaDialogProps } from "@react-aria/dialog";
import type { Placement } from "@react-aria/overlays";
import type { CalendarProps } from "@react-stately/calendar";
import type {
  DatePickerState,
  DateRangePickerState,
  DateValue,
} from "@react-stately/datepicker";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import type { ButtonProps } from "../button/button.types";

export type DatePickerProps<T extends DateValue = DateValue> =
  AriaDatePickerProps<T> & {
    className?: string | undefined;
    children?: ReactNode | undefined;
    ref?: Ref<HTMLDivElement>;
  };

export type DateRangePickerProps<T extends DateValue = DateValue> =
  AriaDateRangePickerProps<T> & {
    className?: string | undefined;
    children?: ReactNode | undefined;
    ref?: Ref<HTMLDivElement>;
  };

export type DatePickerTriggerProps = HTMLAttributes<HTMLDivElement> & {
  className?: string | undefined;
  children?: ReactNode | undefined;
};

export type DatePickerButtonProps = ButtonProps;

export type DatePickerPopoverProps = {
  className?: string | undefined;
  placement?: Placement | undefined;
  children?: ReactNode | undefined;
};

export type DatePickerContextValue = {
  state: DatePickerState;
  groupRef: React.RefObject<HTMLDivElement | null>;
  groupProps: HTMLAttributes<HTMLDivElement>;
  fieldProps: AriaDatePickerProps<DateValue>;
  buttonProps: AriaButtonProps;
  labelProps: HTMLAttributes<HTMLElement>;
  descriptionProps: HTMLAttributes<HTMLElement>;
  errorMessageProps: HTMLAttributes<HTMLElement>;
  dialogProps: AriaDialogProps;
  calendarProps: CalendarProps<DateValue>;
  isDisabled: boolean;
  isInvalid: boolean;
};

export type DateRangePickerContextValue = {
  state: DateRangePickerState;
  groupRef: React.RefObject<HTMLDivElement | null>;
  groupProps: HTMLAttributes<HTMLDivElement>;
  startFieldProps: AriaDatePickerProps<DateValue>;
  endFieldProps: AriaDatePickerProps<DateValue>;
  buttonProps: AriaButtonProps;
  labelProps: HTMLAttributes<HTMLElement>;
  descriptionProps: HTMLAttributes<HTMLElement>;
  errorMessageProps: HTMLAttributes<HTMLElement>;
  dialogProps: AriaDialogProps;
  calendarProps: AriaRangeCalendarProps<DateValue>;
  isDisabled: boolean;
  isInvalid: boolean;
};
