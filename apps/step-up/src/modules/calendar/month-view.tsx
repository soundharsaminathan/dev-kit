import { useIsMobile } from "@dev-ui/hooks";
import { useLayoutEffect, useRef } from "react";
import { EventChip } from "./event-chip";
import styles from "./month-view.module.scss";
import type { CalendarEvent } from "./types";
import {
  addDays,
  endOfMonth,
  eventsForDay,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "./types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE = 3;

type MonthViewProps = {
  focus: Date;
  events: CalendarEvent[];
  scrollToNowToken?: number;
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectDay?: (day: Date) => void;
};

export function MonthView({
  focus,
  events,
  scrollToNowToken = 0,
  onSelectEvent,
  onSelectDay,
}: MonthViewProps) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayCellRef = useRef<HTMLDivElement>(null);
  const didScrollRef = useRef(false);

  const monthStart = startOfMonth(focus);
  const monthEnd = endOfMonth(focus);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();
  const monthKey = `${focus.getFullYear()}-${focus.getMonth()}`;
  const todayInGrid = days.some((day) => isSameDay(day, today));

  useLayoutEffect(() => {
    didScrollRef.current = false;
  }, [monthKey, scrollToNowToken]);

  useLayoutEffect(() => {
    if (!isMobile || didScrollRef.current || !todayInGrid) return;

    const container = scrollRef.current;
    const todayCell = todayCellRef.current;
    if (!container || !todayCell) return;

    const scrollToToday = () => {
      const containerRect = container.getBoundingClientRect();
      const cellRect = todayCell.getBoundingClientRect();
      const targetLeft =
        container.scrollLeft +
        (cellRect.left - containerRect.left) -
        container.clientWidth / 2 +
        cellRect.width / 2;
      const targetTop =
        container.scrollTop +
        (cellRect.top - containerRect.top) -
        Math.max(32, Math.floor(container.clientHeight * 0.2));
      container.scrollLeft = Math.max(0, targetLeft);
      container.scrollTop = Math.max(0, targetTop);
      return true;
    };

    if (scrollToToday()) {
      didScrollRef.current = true;
    }
  }, [isMobile, todayInGrid, monthKey, scrollToNowToken, events.length]);

  return (
    <div className={styles.root}>
      <div ref={scrollRef} className={styles.hScroll}>
        <div className={styles.monthGrid}>
          <div className={styles.weekdayRow}>
            {WEEKDAYS.map((label) => (
              <div key={label} className={styles.weekday}>
                {label}
              </div>
            ))}
          </div>
          <div className={styles.grid}>
            {days.map((day) => {
              const inMonth =
                day.getMonth() === focus.getMonth() &&
                day.getFullYear() === focus.getFullYear();
              const dayEvents = eventsForDay(events, day);
              const visible = dayEvents.slice(0, MAX_VISIBLE);
              const overflow = dayEvents.length - visible.length;
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={day.toISOString()}
                  ref={isToday ? todayCellRef : undefined}
                  className={`${styles.cell} ${inMonth ? "" : styles.outside} ${isToday ? styles.today : ""}`}
                >
                  <button
                    type="button"
                    className={styles.dayButton}
                    aria-label={day.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                    onClick={() => onSelectDay?.(day)}
                  >
                    <span className={styles.dayNumber}>{day.getDate()}</span>
                  </button>
                  <div className={styles.chips}>
                    {visible.map((event) => (
                      <EventChip
                        key={event.id}
                        event={event}
                        compact
                        onSelect={onSelectEvent}
                      />
                    ))}
                    {overflow > 0 ? (
                      <button
                        type="button"
                        className={styles.more}
                        onClick={() => onSelectDay?.(day)}
                      >
                        +{overflow} more
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <span className={styles.srOnly}>
        Showing {monthStart.toDateString()} to {monthEnd.toDateString()}
      </span>
    </div>
  );
}
