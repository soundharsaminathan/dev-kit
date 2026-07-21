import { Text } from "@dev-ui/components/text";
import styles from "./event-chip.module.scss";
import type { CalendarEvent } from "./types";
import { formatTime } from "./types";

type EventChipProps = {
  event: CalendarEvent;
  compact?: boolean;
  onSelect?: ((event: CalendarEvent) => void) | undefined;
};

export function EventChip({ event, compact, onSelect }: EventChipProps) {
  const tone =
    event.kind === "BOOKING"
      ? event.bookingType === "PRIVATE"
        ? "private"
        : event.bookingType === "TRIAL"
          ? "trial"
          : "booking"
      : "session";

  const start = new Date(event.startsAt);

  return (
    <button
      type="button"
      className={`${styles.chip} ${styles[tone]} ${compact ? styles.compact : ""}`}
      onClick={() => onSelect?.(event)}
      title={event.title}
    >
      {!compact ? (
        <span className={styles.time}>{formatTime(start)}</span>
      ) : null}
      <Text className={styles.title}>{event.title}</Text>
    </button>
  );
}
