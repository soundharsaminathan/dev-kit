import { Badge } from "@dev-ui/components/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { STUDIO_ID } from "@/lib/constants";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./plans.module.scss";

type Subscription = {
  id: string;
  status: "ACTIVE" | "DUE" | "EXPIRED" | string;
  periodEnd: string;
  plan?: {
    name: string;
    priceMonthly: number;
    type: string;
  };
};

type Plan = {
  id: string;
  name: string;
  type: string;
  priceMonthly: number;
  classCredits?: number | null;
  active: boolean;
};

export const Route = createFileRoute("/me/plans")({
  component: MePlansPage,
});

function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "DUE") return "warning";
  if (status === "EXPIRED") return "danger";
  return "neutral";
}

function MePlansPage() {
  const { user } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();
  const { studentId } = useActiveStudentContext();

  const [renewTarget, setRenewTarget] = useState<Subscription | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<Plan | null>(null);

  const subscriptionsQuery = useQuery({
    queryKey: ["subscriptions", studentId],
    queryFn: () =>
      api.get<Subscription[]>(`/subscriptions/student/${studentId}`),
    enabled: Boolean(studentId),
  });

  const plansQuery = useQuery({
    queryKey: ["plans", STUDIO_ID],
    queryFn: () => api.get<Plan[]>(`/plans/studio/${STUDIO_ID}`),
    enabled: Boolean(user),
  });

  const activePlanIds = new Set(
    (subscriptionsQuery.data ?? [])
      .filter((s) => s.status === "ACTIVE")
      .map((s) => s.plan?.name)
      .filter(Boolean),
  );

  const availablePlans = (plansQuery.data ?? []).filter((p) => p.active);

  const renewMutation = useMutation({
    mutationFn: () =>
      api.post("/subscriptions/self/renew", {
        subscriptionId: renewTarget!.id,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["subscriptions", studentId],
      });
      setRenewTarget(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      api.post("/subscriptions/self/assign", {
        studentId,
        planId: enrollTarget!.id,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["subscriptions", studentId],
      });
      setEnrollTarget(null);
    },
  });

  async function refetchAll() {
    await Promise.all([subscriptionsQuery.refetch(), plansQuery.refetch()]);
  }

  return (
    <Screen
      title="My plans"
      subtitle="Membership status and renewal dates."
      showBack
      backTo="/me"
    >
      <PullToRefresh onRefresh={refetchAll}>
        {subscriptionsQuery.isLoading ? <SkeletonCardList count={2} /> : null}

        {subscriptionsQuery.isError ? (
          <ErrorState
            description={
              subscriptionsQuery.error instanceof Error
                ? subscriptionsQuery.error.message
                : "Could not load plans."
            }
            action={
              <TouchButton
                variant="primary"
                onClick={() => subscriptionsQuery.refetch()}
              >
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {!subscriptionsQuery.isLoading &&
        !subscriptionsQuery.isError &&
        (!subscriptionsQuery.data || subscriptionsQuery.data.length === 0) ? (
          <EmptyState
            title="No subscriptions"
            description="Browse plans below to subscribe."
          />
        ) : null}

        {subscriptionsQuery.data && subscriptionsQuery.data.length > 0 ? (
          <div className={styles.list}>
            {subscriptionsQuery.data.map((subscription) => (
              <div key={subscription.id} className={styles.row}>
                <div className={styles.rowTop}>
                  <div>
                    <p className={styles.rowTitle}>
                      {subscription.plan?.name ?? "Membership"}
                    </p>
                    <p className={styles.rowType}>
                      {subscription.plan?.type ?? "Plan"}
                    </p>
                  </div>
                  <Badge variant={statusVariant(subscription.status)}>
                    {subscription.status}
                  </Badge>
                </div>
                <div className={styles.rowMeta}>
                  <span>
                    {subscription.status === "ACTIVE" ? "Renews" : "Expired"}{" "}
                    {new Date(subscription.periodEnd).toLocaleDateString()}
                  </span>
                  {subscription.plan ? (
                    <span className={styles.price}>
                      ₹{subscription.plan.priceMonthly}/mo
                    </span>
                  ) : null}
                </div>
                {subscription.status === "DUE" ||
                subscription.status === "EXPIRED" ? (
                  <div>
                    <TouchButton
                      variant="primary"
                      size="sm"
                      onClick={() => setRenewTarget(subscription)}
                    >
                      Renew
                    </TouchButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {availablePlans.length > 0 ? (
          <>
            <p className={styles.sectionLabel}>Available plans</p>
            <div className={styles.list}>
              {availablePlans.map((plan) => (
                <div key={plan.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div>
                      <p className={styles.rowTitle}>{plan.name}</p>
                      <p className={styles.rowType}>
                        {plan.type}
                        {plan.classCredits != null
                          ? ` · ${plan.classCredits} classes`
                          : ""}
                      </p>
                    </div>
                    <span className={styles.price}>
                      ₹{plan.priceMonthly}/mo
                    </span>
                  </div>
                  {!activePlanIds.has(plan.name) ? (
                    <div>
                      <TouchButton
                        variant="primary"
                        size="sm"
                        onClick={() => setEnrollTarget(plan)}
                      >
                        Subscribe
                      </TouchButton>
                    </div>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </PullToRefresh>

      <AppBottomSheet
        isOpen={Boolean(renewTarget)}
        onOpenChange={(open) => {
          if (!open) setRenewTarget(null);
        }}
        title="Renew plan"
      >
        <div className={styles.sheetBody}>
          <p className={styles.sheetDesc}>
            Renew <strong>{renewTarget?.plan?.name ?? "your plan"}</strong> for
            another month
            {renewTarget?.plan?.priceMonthly != null
              ? ` at ₹${renewTarget.plan.priceMonthly}/mo`
              : ""}
            .
          </p>
          {renewMutation.isError ? (
            <ErrorState
              description={
                renewMutation.error instanceof Error
                  ? renewMutation.error.message
                  : "Renewal failed."
              }
            />
          ) : null}
          <TouchButton
            variant="primary"
            fullWidth
            isPending={renewMutation.isPending}
            onClick={() => renewMutation.mutate()}
          >
            Confirm renewal
          </TouchButton>
        </div>
      </AppBottomSheet>

      <AppBottomSheet
        isOpen={Boolean(enrollTarget)}
        onOpenChange={(open) => {
          if (!open) setEnrollTarget(null);
        }}
        title="Subscribe to plan"
      >
        <div className={styles.sheetBody}>
          <p className={styles.sheetDesc}>
            Subscribe to <strong>{enrollTarget?.name}</strong>
            {enrollTarget?.priceMonthly != null
              ? ` for ₹${enrollTarget.priceMonthly}/mo`
              : ""}
            . Your subscription starts next billing cycle.
          </p>
          {assignMutation.isError ? (
            <ErrorState
              description={
                assignMutation.error instanceof Error
                  ? assignMutation.error.message
                  : "Subscription failed."
              }
            />
          ) : null}
          <TouchButton
            variant="primary"
            fullWidth
            isPending={assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            Confirm subscription
          </TouchButton>
        </div>
      </AppBottomSheet>
    </Screen>
  );
}
