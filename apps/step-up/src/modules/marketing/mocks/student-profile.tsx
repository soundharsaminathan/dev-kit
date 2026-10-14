import { STUDENTS } from "./data";
import styles from "./mocks.module.scss";
import { MockApp } from "./shell";

const student = STUDENTS[0];

export function StudentProfileMock() {
  return (
    <MockApp
      nav="students"
      title={student.name}
      subtitle="Enrollment, billing, and attendance."
      showBack
    >
      <div className={styles.softPanel}>
        <div className={styles.identity}>
          <span className={styles.avatar} data-lg="true">
            {student.initials}
          </span>
          <div className={styles.grow}>
            <p className={styles.rowTitle}>{student.name}</p>
            <p className={styles.rowMeta}>8 months paid</p>
            <p className={styles.rowMeta}>iniya@gmail.com</p>
            <p className={styles.rowMeta}>Guardian: Magizhan</p>
            <p className={styles.rowMeta}>Hip Hop, Contemporary</p>
          </div>
          <span className={styles.badge} data-tone="ok">
            Active
          </span>
        </div>
        <div className={styles.actions}>
          <span className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`}>
            Edit profile
          </span>
          <span className={`${styles.btn} ${styles.btnSm}`}>Message</span>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Present</span>
          <p className={styles.metricValue}>42</p>
          <p className={styles.metricHint}>This term</p>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Absent</span>
          <p className={styles.metricValue}>4</p>
          <p className={styles.metricHint}>This term</p>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Batches</p>
        <div className={styles.listCard}>
          <div className={styles.invoiceTop}>
            <span className={styles.rowTitle}>Hip Hop Intermediate</span>
            <span className={styles.badge} data-tone="ok">
              Active
            </span>
          </div>
          <p className={styles.rowMeta}>Since Jan · Adults</p>
        </div>
        <div className={styles.listCard}>
          <div className={styles.invoiceTop}>
            <span className={styles.rowTitle}>Contemporary Open</span>
            <span className={styles.badge} data-tone="ok">
              Active
            </span>
          </div>
          <p className={styles.rowMeta}>Since Mar · Adults</p>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Subscriptions</p>
        <div className={styles.listCard}>
          <div className={styles.invoiceTop}>
            <span className={styles.rowTitle}>Quarterly</span>
            <span className={styles.badge} data-tone="ok">
              Active
            </span>
          </div>
          <p className={styles.rowMeta}>12 Jul – 12 Oct · ₹9,000</p>
        </div>
      </div>
    </MockApp>
  );
}
