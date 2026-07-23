import { Link } from "@tanstack/react-router";
import styles from "./batch-billing.module.scss";

export function BatchBilling() {
  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Membership</h3>
        <p className={styles.help}>
          Membership is studio-wide via{" "}
          <Link to="/app/subscriptions">Subscriptions</Link>, not tied to
          individual batches.
        </p>
      </section>
    </div>
  );
}
