import { cn, composeRefs } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { createCalendar } from "@internationalized/date";
import {
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useRangeCalendar,
} from "@react-aria/calendar";
import { useLocale } from "@react-aria/i18n";
import { mergeProps } from "@react-aria/utils";
import type { RangeCalendarState } from "@react-stately/calendar";
import {
  useCalendarState,
  useRangeCalendarState,
} from "@react-stately/calendar";
import { createContext, Fragment, useContext, useMemo, useRef } from "react";
import { Button } from "../button/Button";
import styles from "./calendar.module.scss";
import type {
  CalendarCellProps,
  CalendarContextValue,
  CalendarGridBodyProps,
  CalendarGridHeaderProps,
  CalendarGridProps,
  CalendarHeaderCellProps,
  CalendarHeaderProps,
  CalendarHeadingProps,
  CalendarProps,
  RangeCalendarProps,
} from "./types";

const CalendarContext = createContext<CalendarContextValue | null>(null);

function useCalendarContext(component: string): CalendarContextValue {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error(
      `${component} must be used within Calendar or RangeCalendar`,
    );
  }
  return context;
}

function Calendar<T extends import("@internationalized/date").DateValue>({
  children,
  className,
  ref,
  ...props
}: CalendarProps<T>) {
  const { locale } = useLocale();
  const state = useCalendarState({
    createCalendar,
    ...props,
    locale,
  });
  const { calendarProps, prevButtonProps, nextButtonProps, title } =
    useCalendar(props, state);

  const contextValue = useMemo(
    () => ({
      state,
      mode: "single" as const,
      prevButtonProps,
      nextButtonProps,
      title,
    }),
    [state, prevButtonProps, nextButtonProps, title],
  );

  return (
    <CalendarContext.Provider value={contextValue}>
      <div
        {...calendarProps}
        ref={ref}
        data-calendar=""
        className={cn(styles.root, className)}
      >
        {children ?? (
          <>
            <CalendarHeader>
              <Button
                {...prevButtonProps}
                variant="quiet"
                isIconOnly
                aria-label={prevButtonProps["aria-label"]}
              >
                <Icon name="chevron-left" className={styles.chevron} />
              </Button>
              <CalendarHeading />
              <Button
                {...nextButtonProps}
                variant="quiet"
                isIconOnly
                aria-label={nextButtonProps["aria-label"]}
              >
                <Icon name="chevron-right" className={styles.chevron} />
              </Button>
            </CalendarHeader>
            <CalendarGrid />
          </>
        )}
      </div>
    </CalendarContext.Provider>
  );
}

function RangeCalendar<T extends import("@internationalized/date").DateValue>({
  children,
  className,
  ref,
  ...props
}: RangeCalendarProps<T>) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const state = useRangeCalendarState({
    createCalendar,
    ...props,
    locale,
  });
  const { calendarProps, prevButtonProps, nextButtonProps, title } =
    useRangeCalendar(props, state, calendarRef);

  const contextValue = useMemo(
    () => ({
      state,
      mode: "range" as const,
      prevButtonProps,
      nextButtonProps,
      title,
    }),
    [state, prevButtonProps, nextButtonProps, title],
  );

  return (
    <CalendarContext.Provider value={contextValue}>
      <div
        {...calendarProps}
        ref={composeRefs(calendarRef, ref)}
        data-range-calendar=""
        className={cn(styles.root, className)}
      >
        {children ?? (
          <>
            <CalendarHeader>
              <Button
                {...prevButtonProps}
                variant="quiet"
                isIconOnly
                aria-label={prevButtonProps["aria-label"]}
              >
                <Icon name="chevron-left" className={styles.chevron} />
              </Button>
              <CalendarHeading />
              <Button
                {...nextButtonProps}
                variant="quiet"
                isIconOnly
                aria-label={nextButtonProps["aria-label"]}
              >
                <Icon name="chevron-right" className={styles.chevron} />
              </Button>
            </CalendarHeader>
            <CalendarGrid />
          </>
        )}
      </div>
    </CalendarContext.Provider>
  );
}

function CalendarHeader({
  className,
  children,
  ...props
}: CalendarHeaderProps) {
  const { prevButtonProps, nextButtonProps } =
    useCalendarContext("CalendarHeader");

  return (
    <header
      data-calendar-header=""
      className={cn(styles.header, className)}
      {...props}
    >
      {children ?? (
        <>
          <Button
            {...prevButtonProps}
            variant="quiet"
            isIconOnly
            aria-label={prevButtonProps["aria-label"]}
          >
            <Icon name="chevron-left" className={styles.chevron} />
          </Button>
          <CalendarHeading />
          <Button
            {...nextButtonProps}
            variant="quiet"
            isIconOnly
            aria-label={nextButtonProps["aria-label"]}
          >
            <Icon name="chevron-right" className={styles.chevron} />
          </Button>
        </>
      )}
    </header>
  );
}
CalendarHeader.displayName = "CalendarHeader";

function CalendarHeading({
  className,
  offset: _offset,
  ...props
}: CalendarHeadingProps) {
  const { title } = useCalendarContext("CalendarHeading");

  return (
    <h2
      data-calendar-heading=""
      suppressHydrationWarning
      className={cn(styles.heading, className)}
      {...props}
    >
      {title}
    </h2>
  );
}
CalendarHeading.displayName = "CalendarHeading";

function CalendarGrid({ className, children, ...props }: CalendarGridProps) {
  const { state } = useCalendarContext("CalendarGrid");
  const { gridProps, headerProps } = useCalendarGrid(props, state);

  return (
    <table
      {...gridProps}
      data-calendar-grid=""
      className={cn(styles.grid, className)}
    >
      {children ?? (
        <>
          <CalendarGridHeader {...headerProps}>
            {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
          </CalendarGridHeader>
          <CalendarGridBody>
            {(date) => <CalendarCell date={date} />}
          </CalendarGridBody>
        </>
      )}
    </table>
  );
}
CalendarGrid.displayName = "CalendarGrid";

function CalendarGridHeader({
  className,
  children,
  ...props
}: CalendarGridHeaderProps) {
  const { state } = useCalendarContext("CalendarGridHeader");
  const { weekDays } = useCalendarGrid({}, state);

  return (
    <thead
      data-calendar-grid-header=""
      className={cn(styles.gridHeader, className)}
      {...props}
    >
      <tr>
        {typeof children === "function"
          ? ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => {
              const day = weekDays[dayOfWeek];
              if (!day) {
                return null;
              }

              return <Fragment key={dayOfWeek}>{children(day)}</Fragment>;
            })
          : (children ??
            ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => {
              const day = weekDays[dayOfWeek];
              if (!day) {
                return null;
              }

              return (
                <CalendarHeaderCell key={dayOfWeek}>{day}</CalendarHeaderCell>
              );
            }))}
      </tr>
    </thead>
  );
}
CalendarGridHeader.displayName = "CalendarGridHeader";

function CalendarHeaderCell({
  className,
  children,
  ...props
}: CalendarHeaderCellProps) {
  return (
    <th
      data-calendar-header-cell=""
      className={cn(styles.gridHeaderCell, className)}
      {...props}
    >
      {children}
    </th>
  );
}
CalendarHeaderCell.displayName = "CalendarHeaderCell";

function CalendarGridBody({
  className,
  children,
  ...props
}: CalendarGridBodyProps) {
  const { state } = useCalendarContext("CalendarGridBody");
  const { weeksInMonth } = useCalendarGrid({}, state);

  return (
    <tbody
      data-calendar-grid-body=""
      className={cn(styles.gridBody, className)}
      {...props}
    >
      {[...new Array(weeksInMonth).keys()].map((weekIndex) => (
        <tr key={weekIndex}>
          {([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => {
            const date = state.getDatesInWeek(weekIndex)[dayOfWeek];

            if (!date) {
              return <td key={`empty-${weekIndex}-${dayOfWeek}`} />;
            }

            if (typeof children === "function") {
              return (
                <Fragment key={date.toString()}>{children(date)}</Fragment>
              );
            }

            return <CalendarCell key={date.toString()} date={date} />;
          })}
        </tr>
      ))}
    </tbody>
  );
}
CalendarGridBody.displayName = "CalendarGridBody";

function isRangeCalendarState(
  state: CalendarContextValue["state"],
): state is RangeCalendarState {
  return "highlightedRange" in state;
}

function CalendarCell({
  date,
  className,
  children,
  ...props
}: CalendarCellProps) {
  const { state, mode } = useCalendarContext("CalendarCell");
  const ref = useRef<HTMLDivElement>(null);
  const {
    cellProps,
    buttonProps,
    isSelected,
    isDisabled,
    isUnavailable,
    isOutsideVisibleRange,
    isInvalid,
    formattedDate,
  } = useCalendarCell({ date, ...props }, state, ref);

  const highlightedRange =
    mode === "range" && isRangeCalendarState(state)
      ? state.highlightedRange
      : null;
  const isSelectionStart =
    highlightedRange?.start.compare(date) === 0 && isSelected;
  const isSelectionEnd =
    highlightedRange?.end.compare(date) === 0 && isSelected;

  return (
    <td {...cellProps}>
      <div
        {...mergeProps(buttonProps, {
          ref,
          "data-calendar-cell": "",
          "data-selected": isSelected ? "true" : undefined,
          "data-disabled": isDisabled ? "true" : undefined,
          "data-unavailable": isUnavailable ? "true" : undefined,
          "data-outside-month": isOutsideVisibleRange ? "true" : undefined,
          "data-invalid": isInvalid ? "true" : undefined,
          "data-selection-start": isSelectionStart ? "true" : undefined,
          "data-selection-end": isSelectionEnd ? "true" : undefined,
          className: cn(styles.cell, className),
        })}
      >
        <span data-cell-inner="" className={styles.cellInner}>
          {children ?? formattedDate}
        </span>
      </div>
    </td>
  );
}
CalendarCell.displayName = "CalendarCell";

export type {
  CalendarCellProps,
  CalendarGridBodyProps,
  CalendarGridHeaderProps,
  CalendarGridProps,
  CalendarHeaderCellProps,
  CalendarHeaderProps,
  CalendarHeadingProps,
  CalendarProps,
  RangeCalendarProps,
} from "./types";
export {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeader,
  CalendarHeaderCell,
  CalendarHeading,
  RangeCalendar,
};
