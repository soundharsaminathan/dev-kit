import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import {
  type BatchOverviewSession,
  formatSessionRange,
  sessionTimingState,
  upcomingSessions,
} from "./batch-overview-helpers";
import styles from "./batch-sessions-lane.module.scss";

const DEFAULT_LIMIT = 5;

type BatchSessionsLaneProps = {
  sessions?: BatchOverviewSession[] | undefined;
  limit?: number | undefined;
};

export function BatchSessionsLane({
  sessions,
  limit = DEFAULT_LIMIT,
}: BatchSessionsLaneProps) {
  const upcoming = upcomingSessions(sessions, new Date(), limit);

  if (upcoming.length === 0) {
    return (
      <section className={styles.root} aria-label="Upcoming sessions">
        <div className={styles.header}>
          <h3 className={styles.title}>Upcoming sessions</h3>
        </div>
        <p className={styles.empty}>No upcoming sessions on the schedule.</p>
      </section>
    );
  }

  return (
    <section className={styles.root} aria-label="Upcoming sessions">
      <div className={styles.header}>
        <h3 className={styles.title}>Upcoming sessions</h3>
        <span className={styles.count}>{upcoming.length}</span>
      </div>
      <ul className={styles.list}>
        {upcoming.map((session, index) => {
          const state = sessionTimingState(session);
          return (
            <li key={session.id}>
              <Link
                to="/app/sessions/$id/attendance"
                params={{ id: session.id }}
                className={styles.row}
                data-state={state}
                data-first={index === 0 ? "true" : undefined}
              >
                <div className={styles.copy}>
                  <span className={styles.when}>
                    {formatSessionRange(session.startsAt, session.endsAt)}
                  </span>
                  <span className={styles.action}>
                    {state === "now" ? "Take attendance" : "Open attendance"}
                  </span>
                </div>
                {state === "now" ? (
                  <span className={styles.live}>Now</span>
                ) : null}
                <Icon name="chevron-right" className={styles.chevron} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
