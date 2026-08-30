import { WEEK_DAYS, WEEK_EVENTS } from "./data";
import styles from "./mocks.module.scss";
import { MockApp } from "./shell";

const HOURS = ["5 PM", "6 PM", "7 PM", "8 PM", "9 PM"];

const TODAY = [
  {
    id: "t1",
    name: "Hip Hop Intermediate",
    time: "6:00 – 7:00 PM",
    room: "Studio A",
  },
  {
    id: "t2",
    name: "Ballet Foundations",
    time: "7:15 – 8:15 PM",
    room: "Studio B",
  },
];

export function ScheduleMock() {
  return (
    <MockApp
      nav="calendar"
      title="Calendar"
      subtitle="Studio schedule across classes and confirmed bookings."
      action={
        <span className={styles.chips}>
          <span className={styles.chip} data-on="true">
            Week
          </span>
          <span className={styles.chip}>Month</span>
        </span>
      }
    >
      <div className={styles.onlyMobile}>
        <div className={styles.chips}>
          {WEEK_DAYS.map((day) => (
            <span
              key={day.id}
              className={styles.chip}
              data-on={day.today ? "true" : undefined}
            >
              {day.label} {day.date}
            </span>
          ))}
        </div>
        <div className={styles.agenda}>
          {TODAY.map((session) => (
            <div key={session.id} className={styles.listCard}>
              <span className={styles.rowTitle}>{session.name}</span>
              <span className={styles.rowMeta}>
                {session.time} · {session.room}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.onlyDesktop} ${styles.fill}`}>
        <div className={styles.week}>
          <div className={styles.weekHead}>
            <span className={styles.gutter} />
            {WEEK_DAYS.map((day) => (
              <span
                key={day.id}
                className={styles.dayHead}
                data-today={day.today ? "true" : undefined}
              >
                {day.label} {day.date}
              </span>
            ))}
          </div>
          <div className={styles.weekBody}>
            <div className={styles.hours}>
              {HOURS.map((hour) => (
                <span key={hour} className={styles.hour}>
                  {hour}
                </span>
              ))}
            </div>
            {WEEK_DAYS.map((day, dayIndex) => (
              <div key={day.id} className={styles.dayCol}>
                {HOURS.map((hour) => (
                  <div key={`${day.id}-${hour}`} className={styles.slot} />
                ))}
                {WEEK_EVENTS.filter((event) => event.day === dayIndex).map(
                  (event) => (
                    <span
                      key={event.id}
                      className={styles.event}
                      style={{ top: event.top, height: event.height }}
                    >
                      {event.label}
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockApp>
  );
}
