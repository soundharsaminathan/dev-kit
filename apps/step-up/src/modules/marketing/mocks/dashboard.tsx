import { CreditCard, LayoutGrid, UserCheck, Users } from "lucide-react";
import type { ComponentType } from "react";
import { BATCHES, OWNER } from "./data";
import styles from "./mocks.module.scss";
import { MockApp } from "./shell";

const METRICS: {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "batches", label: "Batches", value: "12", hint: "Active classes", icon: LayoutGrid },
  { id: "students", label: "Students", value: "148", hint: "All registered", icon: Users },
  { id: "trainers", label: "Trainers", value: "6", hint: "Teaching team", icon: UserCheck },
  { id: "plans", label: "Subscriptions", value: "4", hint: "Memberships", icon: CreditCard },
];

const FUNNEL = [
  { id: "active", label: "Active", value: "96" },
  { id: "signed", label: "Signed in only", value: "18" },
  { id: "trial", label: "Trial attended", value: "22" },
  { id: "left", label: "Left batch", value: "12" },
];

const CHIPS = [
  { id: "life", label: "Lifetime", on: true },
  { id: "month", label: "This month", on: false },
  { id: "quarter", label: "Last quarter", on: false },
];

export function DashboardMock() {
  return (
    <MockApp nav="home" title="Home" subtitle={`Good morning, ${OWNER}`}>
      <div className={`${styles.metrics} ${styles.metricsWide}`}>
        {METRICS.map((item) => (
          <div key={item.id} className={styles.metricCard}>
            <span className={styles.metricLabel}>
              <span className={styles.metricIcon}>
                <item.icon />
              </span>
              {item.label}
            </span>
            <p className={styles.metricValue}>{item.value}</p>
            <p className={styles.metricHint}>{item.hint}</p>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Student pipeline</p>
        <div className={styles.chips}>
          {CHIPS.map((chip) => (
            <span
              key={chip.id}
              className={styles.chip}
              data-on={chip.on ? "true" : undefined}
            >
              {chip.label}
            </span>
          ))}
        </div>
        <div className={styles.metrics}>
          {FUNNEL.map((tile) => (
            <div key={tile.id} className={styles.statTile}>
              <span className={styles.statLabel}>{tile.label}</span>
              <p className={styles.statValue}>{tile.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Current batches</p>
        <ul className={styles.list}>
          {BATCHES.slice(0, 3).map((batch) => (
            <li key={batch.id} className={styles.listCard}>
              <span className={styles.rowTitle}>{batch.name}</span>
              <span className={styles.rowMeta}>
                {batch.schedule} · {batch.branch}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </MockApp>
  );
}
