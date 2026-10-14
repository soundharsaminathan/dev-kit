import styles from "./mocks.module.scss";
import { MockApp } from "./shell";

type PaymentMockProps = {
  paid?: boolean;
};

export function PaymentMock({ paid = false }: PaymentMockProps) {
  return (
    <MockApp
      nav="invoices"
      title="Payment"
      action={
        <span className={styles.badge} data-tone={paid ? "ok" : "warn"}>
          {paid ? "Paid" : "Pending"}
        </span>
      }
    >
      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Invoice</span>
          <p className={styles.metricValue}>₹3,500</p>
          <p className={styles.metricHint}>Monthly · Due 5 Sep</p>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Collected</span>
          <p className={styles.metricValue}>{paid ? "₹3,500" : "₹0"}</p>
          <p className={styles.metricHint}>
            {paid ? "UPI · Just now" : "Outstanding"}
          </p>
        </div>
      </div>
      <div className={styles.listCard}>
        <span className={styles.rowTitle}>Kaniyan</span>
        <span className={styles.rowMeta}>Hip Hop Intermediate</span>
      </div>
      <div className={styles.actions}>
        <span className={styles.btn}>
          {paid ? "View receipt" : "Record payment"}
        </span>
        <span className={`${styles.btn} ${styles.btnQuiet}`}>Remind</span>
      </div>
    </MockApp>
  );
}
