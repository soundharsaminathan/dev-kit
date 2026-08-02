import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import styles from "./batch-revenue.module.scss";

type BatchRevenueResponse = {
  enrolledCount: number;
  totals: {
    collected: number;
    pending: number;
    overdue: number;
    invoiceCount: number;
  };
  bySubscription: Array<{
    subscriptionId: string;
    name: string;
    billingCadence: string;
    collected: number;
    pending: number;
    overdue: number;
    invoiceCount: number;
  }>;
};

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type BatchRevenueProps = {
  batchId: string;
};

export function BatchRevenue({ batchId }: BatchRevenueProps) {
  const api = useApi();
  const query = useQuery({
    queryKey: ["batch-revenue", batchId],
    queryFn: () => api.get<BatchRevenueResponse>(`/batches/${batchId}/revenue`),
  });

  if (query.isLoading) {
    return (
      <section className={styles.root} aria-label="Batch revenue">
        <div className={styles.header}>
          <h3 className={styles.title}>Revenue</h3>
        </div>
        <p className={styles.empty}>Loading revenue…</p>
      </section>
    );
  }

  if (query.isError || !query.data) {
    return (
      <section className={styles.root} aria-label="Batch revenue">
        <div className={styles.header}>
          <h3 className={styles.title}>Revenue</h3>
        </div>
        <p className={styles.empty} role="alert">
          {query.error instanceof Error
            ? query.error.message
            : "Could not load revenue."}
        </p>
      </section>
    );
  }

  const { totals, bySubscription, enrolledCount } = query.data;

  return (
    <section className={styles.root} aria-label="Batch revenue">
      <div className={styles.header}>
        <h3 className={styles.title}>Revenue</h3>
        <span className={styles.meta}>
          {enrolledCount} enrolled · {totals.invoiceCount} invoice
          {totals.invoiceCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Collected</span>
          <span className={styles.metricValue} data-tone="success">
            {formatInr(totals.collected)}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Pending</span>
          <span className={styles.metricValue}>
            {formatInr(totals.pending)}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Overdue</span>
          <span
            className={styles.metricValue}
            data-tone={totals.overdue > 0 ? "danger" : undefined}
          >
            {formatInr(totals.overdue)}
          </span>
        </div>
      </div>
      {bySubscription.length > 0 ? (
        <ul className={styles.planList}>
          {bySubscription.map((row) => (
            <li key={row.subscriptionId} className={styles.planRow}>
              <div className={styles.planCopy}>
                <span className={styles.planName}>{row.name}</span>
                <span className={styles.planMeta}>
                  {row.billingCadence === "QUARTERLY" ? "Quarterly" : "Monthly"}{" "}
                  · {row.invoiceCount} invoice
                  {row.invoiceCount === 1 ? "" : "s"}
                </span>
              </div>
              <span className={styles.planCollected}>
                {formatInr(row.collected)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          No membership invoices yet for enrolled students.
        </p>
      )}
    </section>
  );
}
