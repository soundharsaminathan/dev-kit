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
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectDay?: (day: Date) => void;
};

export function MonthView({
  focus,
  events,
  onSelectEvent,
  onSelectDay,
}: MonthViewProps) {
  const monthStart = startOfMonth(focus);
  const monthEnd = endOfMonth(focus);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();

  return (
    <div className={styles.root}>
      <div className={styles.hScroll}>
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

              return (
                <div
                  key={day.toISOString()}
                  className={`${styles.cell} ${inMonth ? "" : styles.outside} ${isSameDay(day, today) ? styles.today : ""}`}
                >
                  <button
                    type="button"
                    className={styles.dayButton}
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
