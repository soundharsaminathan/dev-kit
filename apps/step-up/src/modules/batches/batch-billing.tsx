import { Button } from "@dev-ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { ApiState } from "@/modules/ui/api-state";
import styles from "./batch-billing.module.scss";

type BillingCadence = "MONTHLY" | "FULL_BATCH";

type PlanSummary = {
  id: string;
  name: string;
  billingCadence: BillingCadence;
  priceMonthly: number;
  type: string;
};

type PlanOption = {
  id: string;
  name: string;
  type: string;
  billingCadence: BillingCadence;
  active: boolean;
};

type RevenueTotals = {
  collected: number;
  pending: number;
  overdue: number;
  invoiceCount: number;
};

type BatchRevenue = {
  monthlyPlan: PlanSummary | null;
  fullBatchPlan: PlanSummary | null;
  enrolledCount: number;
  totals: RevenueTotals;
  byPlan: Array<{
    planId: string;
    name: string;
    billingCadence: BillingCadence;
    collected: number;
    pending: number;
    overdue: number;
    invoiceCount: number;
  }>;
};

type BatchBillingProps = {
  batchId: string;
  monthlyPlanId: string | null;
  fullBatchPlanId: string | null;
};

const NONE_KEY = "__none__";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BatchBilling({
  batchId,
  monthlyPlanId: initialMonthlyPlanId,
  fullBatchPlanId: initialFullBatchPlanId,
}: BatchBillingProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [monthlyPlanId, setMonthlyPlanId] = useState<string | null>(
    initialMonthlyPlanId,
  );
  const [fullBatchPlanId, setFullBatchPlanId] = useState<string | null>(
    initialFullBatchPlanId,
  );

  const plans = useQuery({
    queryKey: ["plans", STUDIO_ID],
    queryFn: () => api.get<PlanOption[]>(`/plans/studio/${STUDIO_ID}`),
  });

  const revenue = useQuery({
    queryKey: ["batch-revenue", batchId],
    queryFn: () => api.get<BatchRevenue>(`/batches/${batchId}/revenue`),
  });

  const monthlyPlans = useMemo(
    () =>
      plans.data?.filter(
        (plan) =>
          plan.active &&
          plan.type === "FIXED_BATCH" &&
          plan.billingCadence === "MONTHLY",
      ) ?? [],
    [plans.data],
  );
  const fullBatchPlans = useMemo(
    () =>
      plans.data?.filter(
        (plan) =>
          plan.active &&
          plan.type === "FIXED_BATCH" &&
          plan.billingCadence === "FULL_BATCH",
      ) ?? [],
    [plans.data],
  );

  const isValid = Boolean(monthlyPlanId || fullBatchPlanId);
  const isDirty =
    monthlyPlanId !== initialMonthlyPlanId ||
    fullBatchPlanId !== initialFullBatchPlanId;

  const savePlans = useMutation({
    mutationFn: () =>
      api.patch(`/batches/${batchId}`, {
        monthlyPlanId,
        fullBatchPlanId,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
        queryClient.invalidateQueries({ queryKey: ["batch-revenue", batchId] }),
        queryClient.invalidateQueries({ queryKey: ["batches", STUDIO_ID] }),
      ]);
    },
  });

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Subscription offers</h3>
        <div className={styles.formGrid}>
          <Select
            label="Monthly plan"
            placeholder={plans.isLoading ? "Loading plans…" : "No monthly plan"}
            selectedKey={monthlyPlanId ?? NONE_KEY}
            onSelectionChange={(key) =>
              setMonthlyPlanId(
                !key || key === NONE_KEY ? null : (key as string),
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id={NONE_KEY}>None</SelectItem>
              {monthlyPlans.map((plan) => (
                <SelectItem key={plan.id} id={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            label="Full-batch plan"
            placeholder={
              plans.isLoading ? "Loading plans…" : "No full-batch plan"
            }
            selectedKey={fullBatchPlanId ?? NONE_KEY}
            onSelectionChange={(key) =>
              setFullBatchPlanId(
                !key || key === NONE_KEY ? null : (key as string),
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id={NONE_KEY}>None</SelectItem>
              {fullBatchPlans.map((plan) => (
                <SelectItem key={plan.id} id={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className={styles.help}>
          At least one offer is required. Manage plan prices in{" "}
          <Link to="/app/plans">Plans</Link>.
        </p>
        {plans.isError ? (
          <p className={styles.error}>Plans could not be loaded.</p>
        ) : null}
        {savePlans.isError ? (
          <p className={styles.error}>
            {savePlans.error instanceof Error
              ? savePlans.error.message
              : "Could not save billing plans."}
          </p>
        ) : null}
        <Button
          variant="primary"
          onClick={() => savePlans.mutate()}
          isPending={savePlans.isPending}
          isDisabled={!isValid || !isDirty}
        >
          Save billing plans
        </Button>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Revenue</h3>
        <ApiState
          isLoading={revenue.isLoading}
          isError={revenue.isError}
          error={revenue.error}
          data={revenue.data}
          emptyTitle="No revenue data"
          emptyDescription="Revenue appears once enrolled students have invoices on this batch’s plans."
        >
          {(data) => (
            <>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Enrolled</span>
                  <span className={styles.metricValue}>
                    {data.enrolledCount}
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Collected</span>
                  <span className={styles.metricValue}>
                    {formatPrice(data.totals.collected)}
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Pending</span>
                  <span className={styles.metricValue}>
                    {formatPrice(data.totals.pending)}
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Overdue</span>
                  <span className={styles.metricValue}>
                    {formatPrice(data.totals.overdue)}
                  </span>
                </div>
              </div>

              {data.byPlan.length > 0 ? (
                <ul className={styles.breakdown}>
                  {data.byPlan.map((row) => (
                    <li key={row.planId} className={styles.breakdownItem}>
                      <div>
                        <strong>{row.name}</strong>
                        <p className={styles.breakdownMeta}>
                          {row.billingCadence === "FULL_BATCH"
                            ? "Full batch"
                            : "Monthly"}{" "}
                          · {row.invoiceCount} invoices
                        </p>
                      </div>
                      <div className={styles.breakdownMeta}>
                        {formatPrice(row.collected)} collected ·{" "}
                        {formatPrice(row.pending)} pending ·{" "}
                        {formatPrice(row.overdue)} overdue
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.help}>
                  No invoices yet for the linked plans on enrolled students.
                </p>
              )}
            </>
          )}
        </ApiState>
      </section>
    </div>
  );
}
