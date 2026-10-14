import { Text } from "@dev-ui/components/text";
import { useIsMobile } from "@dev-ui/hooks";
import { useLayoutEffect, useRef } from "react";
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
  scrollToNowToken?: number;
  onSelectEvent?: (event: CalendarEvent) => void;
};

function nowTopPercent(date: Date): number {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (minutes / (24 * 60)) * 100;
}

export function WeekView({
  focus,
  events,
  scrollToNowToken = 0,
  onSelectEvent,
}: WeekViewProps) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const nowMarkerRef = useRef<HTMLDivElement>(null);
  const didScrollRef = useRef(false);

  const weekStart = startOfWeek(focus);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const todayInWeek = days.some((day) => isSameDay(day, today));
  const nowTop = nowTopPercent(today);

  useLayoutEffect(() => {
    didScrollRef.current = false;
  }, [weekStart.getTime(), scrollToNowToken]);

  useLayoutEffect(() => {
    if (didScrollRef.current || !todayInWeek) return;

    const container = scrollRef.current;
    if (!container) return;

    const scrollToNow = () => {
      const todayColumn = todayColumnRef.current;
      const nowMarker = nowMarkerRef.current;
      if (!todayColumn || !nowMarker) return false;

      const containerRect = container.getBoundingClientRect();

      if (isMobile) {
        const columnRect = todayColumn.getBoundingClientRect();
        const targetLeft =
          container.scrollLeft +
          (columnRect.left - containerRect.left) -
          container.clientWidth / 2 +
          columnRect.width / 2;
        container.scrollLeft = Math.max(0, targetLeft);
      }

      const markerRect = nowMarker.getBoundingClientRect();
      const targetTop =
        container.scrollTop +
        (markerRect.top - containerRect.top) -
        Math.max(48, Math.floor(container.clientHeight * 0.28));
      container.scrollTop = Math.max(0, targetTop);
      return true;
    };

    if (scrollToNow()) {
      didScrollRef.current = true;
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (scrollToNow()) {
        didScrollRef.current = true;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [
    todayInWeek,
    isMobile,
    weekStart.getTime(),
    scrollToNowToken,
    events.length,
  ]);

  return (
    <div className={styles.root}>
      <div ref={scrollRef} className={styles.hScroll}>
        <div className={styles.weekGrid}>
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
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  ref={isToday ? todayColumnRef : undefined}
                  className={styles.dayColumn}
                >
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
                  {isToday ? (
                    <div
                      ref={nowMarkerRef}
                      className={styles.nowMarker}
                      style={{ top: `${nowTop}%` }}
                      aria-hidden
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
