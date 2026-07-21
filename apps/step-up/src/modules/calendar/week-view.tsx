import { Text } from "@dev-ui/components/text";
import { EventChip } from "./event-chip";
import type { CalendarEvent } from "./types";
import {
  addDays,
  eventPositionInDay,
  eventsForDay,
  formatDayLabel,
  isSameDay,
  startOfWeek,
} from "./types";
import styles from "./week-view.module.scss";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type WeekViewProps = {
  focus: Date;
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
};

export function WeekView({ focus, events, onSelectEvent }: WeekViewProps) {
  const weekStart = startOfWeek(focus);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.gutter} />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`${styles.dayHeader} ${isSameDay(day, today) ? styles.today : ""}`}
          >
            <Text className={styles.dayLabel}>{formatDayLabel(day)}</Text>
          </div>
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.hours}>
          {HOURS.map((hour) => (
            <div key={hour} className={styles.hourLabel}>
              {hour === 0
                ? ""
                : new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, {
                    hour: "numeric",
                  })}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          return (
            <div key={day.toISOString()} className={styles.dayColumn}>
              {HOURS.map((hour) => (
                <div key={hour} className={styles.hourSlot} />
              ))}
              <div className={styles.eventsLayer}>
                {dayEvents.map((event) => {
                  const { top, height } = eventPositionInDay(event, day);
                  return (
                    <div
                      key={event.id}
                      className={styles.eventBlock}
                      style={{ top: `${top}%`, height: `${height}%` }}
                    >
                      <EventChip event={event} onSelect={onSelectEvent} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
