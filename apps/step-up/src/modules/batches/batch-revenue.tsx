import { ToggleButton } from "@dev-ui/components/toggle-button";
import { ToggleButtonGroup } from "@dev-ui/components/toggle-button-group";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import styles from "./batch-revenue.module.scss";

type RevenuePeriod = "month" | "all";

type BatchRevenueResponse = {
  period: RevenuePeriod;
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
  const [period, setPeriod] = useState<RevenuePeriod>("month");
  const query = useQuery({
    queryKey: ["batch-revenue", batchId, period],
    queryFn: () =>
      api.get<BatchRevenueResponse>(
        `/batches/${batchId}/revenue?period=${period}`,
      ),
  });

  return (
    <section className={styles.root} aria-label="Batch revenue">
      <div className={styles.header}>
        <h3 className={styles.title}>Revenue</h3>
        <ToggleButtonGroup
          aria-label="Revenue period"
          selectionMode="single"
          selectedKeys={[period]}
          disallowEmptySelection
          size="sm"
          onSelectionChange={(keys) => {
            const next = String([...keys][0] ?? "");
            if (next === "month" || next === "all") {
              setPeriod(next);
            }
          }}
        >
          <ToggleButton id="month">This month</ToggleButton>
          <ToggleButton id="all">Overall</ToggleButton>
        </ToggleButtonGroup>
      </div>

      {query.isLoading ? (
        <p className={styles.empty}>Loading revenue…</p>
      ) : null}

      {query.isError || (!query.isLoading && !query.data) ? (
        <p className={styles.empty} role="alert">
          {query.error instanceof Error
            ? query.error.message
            : "Could not load revenue."}
        </p>
      ) : null}

      {query.data ? (
        <>
          <span className={styles.meta}>
            {query.data.enrolledCount} enrolled · {query.data.totals.invoiceCount}{" "}
            invoice
            {query.data.totals.invoiceCount === 1 ? "" : "s"}
            {period === "month" ? " this month" : " all time"}
          </span>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Collected</span>
              <span className={styles.metricValue} data-tone="success">
                {formatInr(query.data.totals.collected)}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Pending</span>
              <span className={styles.metricValue}>
                {formatInr(query.data.totals.pending)}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Overdue</span>
              <span
                className={styles.metricValue}
                data-tone={
                  query.data.totals.overdue > 0 ? "danger" : undefined
                }
              >
                {formatInr(query.data.totals.overdue)}
              </span>
            </div>
          </div>
          {query.data.bySubscription.length > 0 ? (
            <ul className={styles.planList}>
              {query.data.bySubscription.map((row) => (
                <li key={row.subscriptionId} className={styles.planRow}>
                  <div className={styles.planCopy}>
                    <span className={styles.planName}>{row.name}</span>
                    <span className={styles.planMeta}>
                      {row.billingCadence === "QUARTERLY"
                        ? "Quarterly"
                        : "Monthly"}{" "}
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
              {period === "month"
                ? "No membership invoices for this month yet."
                : "No membership invoices yet for enrolled students."}
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
