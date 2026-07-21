import styles from "./cards.module.scss";
import type { ChatEventInfo, ChatRsvpStatus } from "./types";

type EventCardProps = {
  event: ChatEventInfo;
  currentUserId: string;
  onRsvp: (status: ChatRsvpStatus) => void;
  rsvpPending?: boolean | undefined;
};

const RSVP_LABELS: Record<ChatRsvpStatus, string> = {
  GOING: "Going",
  MAYBE: "Maybe",
  DECLINED: "No",
};

function formatEventWhen(startsAt: string, endsAt: string | null) {
  const start = new Date(startsAt);
  const dateText = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeText = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endsAt) {
    return `${dateText} · ${timeText}`;
  }
  const end = new Date(endsAt);
  const endTime = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateText} · ${timeText} – ${endTime}`;
}

export function EventCard({
  event,
  currentUserId,
  onRsvp,
  rsvpPending,
}: EventCardProps) {
  const myStatus = (Object.keys(event.rsvps) as ChatRsvpStatus[]).find(
    (status) => event.rsvps[status].includes(currentUserId),
  );

  return (
    <div className={styles.event}>
      <div className={styles.eventTop}>
        <span className={styles.eventEyebrow}>Event</span>
        <p className={styles.eventTitle}>{event.title}</p>
        <p className={styles.eventWhen}>
          {formatEventWhen(event.startsAt, event.endsAt)}
        </p>
        {event.locationLabel ? (
          <p className={styles.eventWhere}>{event.locationLabel}</p>
        ) : null}
        {event.description ? (
          <p className={styles.eventDescription}>{event.description}</p>
        ) : null}
      </div>

      <fieldset className={styles.rsvp}>
        {(Object.keys(RSVP_LABELS) as ChatRsvpStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            className={styles.rsvpOption}
            data-active={myStatus === status || undefined}
            disabled={rsvpPending}
            onClick={() => onRsvp(status)}
          >
            {RSVP_LABELS[status]}
            {event.rsvps[status].length > 0 ? (
              <span className={styles.rsvpCount}>
                {event.rsvps[status].length}
              </span>
            ) : null}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
