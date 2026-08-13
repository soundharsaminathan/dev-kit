import styles from "./cards.module.scss";
import type { ChatEventInfo, ChatRsvpStatus } from "./types";

type EventCardProps = {
  event: ChatEventInfo;
  currentUserId: string;
  onRsvp: (status: ChatRsvpStatus) => void;
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
    return { dateText, timeText };
  }
  const end = new Date(endsAt);
  const endTime = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return { dateText, timeText: `${timeText} – ${endTime}` };
}

function sessionCardKind(title: string) {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes("cancelled") || normalized.includes("canceled")) {
    return "cancelled" as const;
  }
  if (normalized.includes("rescheduled") || normalized.includes("changed")) {
    return "changed" as const;
  }
  if (normalized.includes("new class") || normalized.startsWith("new ")) {
    return "added" as const;
  }
  return "event" as const;
}

const EYEBROW: Record<ReturnType<typeof sessionCardKind>, string> = {
  event: "Event",
  added: "New session",
  changed: "Rescheduled",
  cancelled: "Cancelled",
};

export function EventCard({
  event,
  currentUserId,
  onRsvp,
}: EventCardProps) {
  const kind = sessionCardKind(event.title);
  const when = formatEventWhen(event.startsAt, event.endsAt);
  const myStatus = (Object.keys(event.rsvps) as ChatRsvpStatus[]).find(
    (status) => event.rsvps[status].includes(currentUserId),
  );

  return (
    <div className={styles.event} data-kind={kind}>
      <div className={styles.eventTop}>
        <span className={styles.eventEyebrow}>{EYEBROW[kind]}</span>
        <p className={styles.eventTitle}>{event.title}</p>
        <p className={styles.eventWhen}>
          <span className={styles.eventDate}>{when.dateText}</span>
          <span className={styles.eventTime}>{when.timeText}</span>
        </p>
        {event.locationLabel ? (
          <p className={styles.eventWhere}>{event.locationLabel}</p>
        ) : null}
        {event.description ? (
          <p className={styles.eventDescription}>{event.description}</p>
        ) : null}
      </div>

      {kind === "cancelled" ? null : (
        <fieldset className={styles.rsvp}>
          {(Object.keys(RSVP_LABELS) as ChatRsvpStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              className={styles.rsvpOption}
              data-active={myStatus === status || undefined}
              onClick={() => {
                if (myStatus !== status) {
                  onRsvp(status);
                }
              }}
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
      )}
    </div>
  );
}
