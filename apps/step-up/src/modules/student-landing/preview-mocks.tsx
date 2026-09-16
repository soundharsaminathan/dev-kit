import type { ReactNode } from "react";
import { STUDENT_PREVIEW } from "./content";
import styles from "./preview-mocks.module.scss";

type TabId = "home" | "discover" | "profile";

const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: STUDENT_PREVIEW.home },
  { id: "discover", label: STUDENT_PREVIEW.discover },
  { id: "profile", label: STUDENT_PREVIEW.profile },
];

function TabIcon({ id }: { id: TabId }) {
  if (id === "discover") {
    return (
      <svg viewBox="0 0 24 24" className={styles.tabIcon} aria-hidden>
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "profile") {
    return (
      <svg viewBox="0 0 24 24" className={styles.tabIcon} aria-hidden>
        <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M5.5 19.2c1.2-3 3.6-4.6 6.5-4.6s5.3 1.6 6.5 4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={styles.tabIcon} aria-hidden>
      <path
        d="M4.5 11.2 12 5.2l7.5 6V19a1.2 1.2 0 0 1-1.2 1.2H5.7A1.2 1.2 0 0 1 4.5 19Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Phone({
  tab,
  title,
  children,
}: {
  tab: TabId;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.phone} aria-hidden>
      <header className={styles.head}>
        <p className={styles.title}>{title}</p>
      </header>
      <div className={styles.body}>{children}</div>
      <nav className={styles.tabs}>
        {TABS.map((item) => (
          <span
            key={item.id}
            className={styles.tab}
            data-active={item.id === tab ? "true" : undefined}
          >
            <TabIcon id={item.id} />
            {item.label}
          </span>
        ))}
      </nav>
    </div>
  );
}

export function StudentHomePreview() {
  return (
    <Phone tab="home" title="Home">
      <p className={styles.eyebrow}>4D-Flo · Adyar</p>
      <p className={styles.hello}>Hey Iniya</p>
      <div className={styles.heroCard}>
        <p className={styles.heroKicker}>Next class</p>
        <p className={styles.heroTitle}>Hip Hop Intermediate</p>
        <p className={styles.heroMeta}>Today 6:00 PM · Studio A</p>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>12</span>
          <span className={styles.statLabel}>Day streak</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>42</span>
          <span className={styles.statLabel}>Classes done</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>8</span>
          <span className={styles.statLabel}>This month</span>
        </div>
      </div>
      <div className={styles.card}>
        <p className={styles.cardKicker}>Keep going</p>
        <p className={styles.cardTitle}>Contemporary Open</p>
        <div className={styles.bar}>
          <span style={{ width: "67%" }} />
        </div>
        <p className={styles.cardMeta}>8 of 12 sessions</p>
      </div>
    </Phone>
  );
}

export function StudentDiscoverPreview() {
  return (
    <Phone tab="discover" title="Discover">
      <div className={styles.search}>Search classes near you</div>
      <div className={styles.chips}>
        <span data-on="true">Dance</span>
        <span>Music</span>
        <span>Art</span>
      </div>
      <div className={styles.card}>
        <p className={styles.cardTitle}>4D-Flo</p>
        <p className={styles.cardMeta}>Free style and choreography</p>
        <p className={styles.cardMeta}>Adyar · From ₹2,000 a month</p>
        <span className={styles.cta}>View studio</span>
      </div>
      <div className={styles.card}>
        <p className={styles.cardTitle}>E-Grade</p>
        <p className={styles.cardMeta}>Free style · Couple dance</p>
        <p className={styles.cardMeta}>Chennai · From ₹999 a month</p>
        <span className={styles.cta}>View studio</span>
      </div>
    </Phone>
  );
}

export function StudentProfilePreview() {
  return (
    <Phone tab="profile" title="Profile">
      <div className={styles.identity}>
        <span className={styles.avatar}>IN</span>
        <div>
          <p className={styles.cardTitle}>Iniya</p>
          <p className={styles.cardMeta}>Member at 4D-Flo</p>
        </div>
      </div>
      <div className={styles.card}>
        <p className={styles.cardKicker}>Your classes</p>
        <p className={styles.row}>
          Hip Hop Intermediate
          <span>Active</span>
        </p>
        <p className={styles.row}>
          Contemporary Open
          <span>Active</span>
        </p>
      </div>
      <div className={styles.card}>
        <p className={styles.cardKicker}>Attendance</p>
        <p className={styles.row}>
          12 Apr · Hip Hop
          <span data-ok="">Present</span>
        </p>
        <p className={styles.row}>
          10 Apr · Contemporary
          <span data-ok="">Present</span>
        </p>
        <p className={styles.row}>
          8 Apr · Hip Hop
          <span>Absent</span>
        </p>
      </div>
    </Phone>
  );
}
