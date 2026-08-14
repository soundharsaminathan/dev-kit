import { cn, composeRefs } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import {
  createCalendar,
  isSameDay,
  isSameMonth,
  today,
} from "@internationalized/date";
import {
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useRangeCalendar,
} from "@react-aria/calendar";
import { useDateFormatter, useLocale } from "@react-aria/i18n";
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
      gridOffset: 0,
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
  numberOfMonths = 1,
  ref,
  ...props
}: RangeCalendarProps<T>) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const state = useRangeCalendarState({
    createCalendar,
    ...props,
    locale,
    visibleDuration: { months: numberOfMonths },
    ...(numberOfMonths > 1 && props.selectionAlignment === undefined
      ? { selectionAlignment: "start" as const }
      : {}),
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
      gridOffset: 0,
    }),
    [state, prevButtonProps, nextButtonProps, title],
  );

  const months = useMemo(
    () => (numberOfMonths > 1 ? [...new Array(numberOfMonths).keys()] : []),
    [numberOfMonths],
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
            {months.length > 0 ? (
              <div data-calendar-months="" className={styles.months}>
                {months.map((index) => (
                  <div
                    key={index}
                    data-calendar-month=""
                    className={styles.month}
                  >
                    <CalendarHeading offset={{ months: index }} />
                    <CalendarGrid offset={{ months: index }} />
                  </div>
                ))}
              </div>
            ) : (
              <CalendarGrid />
            )}
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
  offset,
  ...props
}: CalendarHeadingProps) {
  const { state, gridOffset, title } = useCalendarContext("CalendarHeading");
  const isGridHeading = offset?.months !== undefined || gridOffset > 0;
  const dateFormatter = useDateFormatter({ month: "long", year: "numeric" });

  const heading = isGridHeading
    ? dateFormatter.format(
        state.visibleRange.start
          .add({ months: gridOffset + (offset?.months ?? 0) })
          .toDate(state.timeZone),
      )
    : title;

  return (
    <h2
      data-calendar-heading=""
      suppressHydrationWarning
      className={cn(styles.heading, className)}
      {...props}
    >
      {heading}
    </h2>
  );
}
CalendarHeading.displayName = "CalendarHeading";

function CalendarGrid({
  className,
  children,
  offset,
  ...props
}: CalendarGridProps) {
  const context = useCalendarContext("CalendarGrid");
  const { state, gridOffset } = context;
  const offsetMonths = gridOffset + (offset?.months ?? 0);
  const startDate = state.visibleRange.start.add({ months: offsetMonths });
  const endDate = startDate.add({ months: 1 }).subtract({ days: 1 });
  const { gridProps, headerProps } = useCalendarGrid(
    { ...props, startDate, endDate },
    state,
  );

  const gridContext = useMemo(
    () => ({ ...context, gridOffset: offsetMonths }),
    [context, offsetMonths],
  );

  return (
    <CalendarContext.Provider value={gridContext}>
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
    </CalendarContext.Provider>
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
  offset,
  ...props
}: CalendarGridBodyProps) {
  const { state, gridOffset } = useCalendarContext("CalendarGridBody");
  const offsetMonths = gridOffset + (offset?.months ?? 0);
  const startDate = state.visibleRange.start.add({ months: offsetMonths });
  const { weeksInMonth } = useCalendarGrid({ startDate }, state);

  return (
    <tbody
      data-calendar-grid-body=""
      className={cn(styles.gridBody, className)}
      {...props}
    >
      {[...new Array(weeksInMonth).keys()].map((weekIndex) => (
        <tr key={weekIndex}>
          {([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => {
            const date = state.getDatesInWeek(weekIndex, startDate)[dayOfWeek];

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
  const { state, mode, gridOffset } = useCalendarContext("CalendarCell");
  const ref = useRef<HTMLDivElement>(null);
  const isOutsideMonth = !isSameMonth(
    date,
    state.visibleRange.start.add({ months: gridOffset }),
  );
  const isToday = isSameDay(date, today(state.timeZone));
  const {
    cellProps,
    buttonProps,
    isSelected,
    isDisabled,
    isUnavailable,
    isInvalid,
    formattedDate,
  } = useCalendarCell({ date, isOutsideMonth, ...props }, state, ref);

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
          "data-today": isToday ? "true" : undefined,
          "data-disabled": isDisabled ? "true" : undefined,
          "data-unavailable": isUnavailable ? "true" : undefined,
          "data-outside-month": isOutsideMonth ? "true" : undefined,
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
