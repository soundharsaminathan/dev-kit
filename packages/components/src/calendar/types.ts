import type { CalendarDate } from "@internationalized/date";
import type { AriaButtonProps } from "@react-aria/button";
import type {
  AriaCalendarCellProps,
  AriaCalendarGridProps,
  AriaCalendarProps,
  AriaRangeCalendarProps,
} from "@react-aria/calendar";
import type {
  CalendarState,
  RangeCalendarState,
} from "@react-stately/calendar";
import type { DateValue } from "@react-stately/datepicker";
import type { HTMLAttributes, ReactNode, Ref } from "react";

export type CalendarMode = "single" | "range";

export type CalendarContextValue = {
  state: CalendarState | RangeCalendarState;
  mode: CalendarMode;
  prevButtonProps: AriaButtonProps;
  nextButtonProps: AriaButtonProps;
  title: string;
};

export type CalendarProps<T extends DateValue = DateValue> =
  AriaCalendarProps<T> & {
    className?: string | undefined;
    children?: ReactNode | undefined;
    ref?: Ref<HTMLDivElement>;
  };

export type RangeCalendarProps<T extends DateValue = DateValue> =
  AriaRangeCalendarProps<T> & {
    className?: string | undefined;
    children?: ReactNode | undefined;
    ref?: Ref<HTMLDivElement>;
  };

export type CalendarHeaderProps = HTMLAttributes<HTMLElement> & {
  className?: string | undefined;
  children?: ReactNode | undefined;
};

export type CalendarHeadingProps = HTMLAttributes<HTMLElement> & {
  className?: string | undefined;
  offset?: { months?: number } | undefined;
};

export type CalendarGridProps = AriaCalendarGridProps & {
  className?: string | undefined;
  children?: ReactNode | undefined;
};

export type CalendarGridHeaderProps = Omit<
  HTMLAttributes<HTMLTableSectionElement>,
  "children"
> & {
  className?: string | undefined;
  children?: ReactNode | ((day: string) => ReactNode);
};

export type CalendarHeaderCellProps = HTMLAttributes<HTMLTableCellElement> & {
  className?: string | undefined;
  children?: ReactNode | undefined;
};

export type CalendarGridBodyProps = Omit<
  HTMLAttributes<HTMLTableSectionElement>,
  "children"
> & {
  className?: string | undefined;
  children?: ReactNode | ((date: CalendarDate) => ReactNode);
};

export type CalendarCellProps = AriaCalendarCellProps & {
  className?: string | undefined;
  children?: ReactNode | undefined;
};
