import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type Plan = {
  id: string;
  name: string;
  type: string;
  billingCadence?: "MONTHLY" | "FULL_BATCH";
  priceMonthly: number;
  classCredits?: number | null;
  active: boolean;
};

export const Route = createFileRoute("/app/plans/")({
  component: PlansPage,
});

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function PlansPage() {
  const api = useApi();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["plans", STUDIO_ID],
    queryFn: () => api.get<Plan[]>(`/plans/studio/${STUDIO_ID}`),
  });

  return (
    <Screen
      title="Plans"
      subtitle="Membership plans students can subscribe to."
      actions={
        <TouchButton variant="primary" size="md">
          <Link to="/app/plans/new">Add</Link>
        </TouchButton>
      }
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={staff.section}>
          {query.isLoading ? <SkeletonCardList count={3} /> : null}

          {query.isError ? (
            <ErrorState
              description={
                query.error instanceof Error
                  ? query.error.message
                  : "Could not load plans."
              }
              action={
                <TouchButton variant="primary" onClick={() => query.refetch()}>
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {query.data && query.data.length === 0 ? (
            <EmptyState
              title="No plans yet"
              description="Create a plan to sell memberships."
              action={
                <TouchButton variant="primary">
                  <Link to="/app/plans/new">Add plan</Link>
                </TouchButton>
              }
            />
          ) : null}

          {query.data && query.data.length > 0 ? (
            <div className={staff.list}>
              {query.data.map((plan) => (
                <PressableCard
                  key={plan.id}
                  onClick={() =>
                    void navigate({
                      to: "/app/plans/$id",
                      params: { id: plan.id },
                    })
                  }
                >
                  <div className={staff.rowCard}>
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>{plan.name}</span>
                      <span className={staff.rowMeta}>
                        {formatPrice(plan.priceMonthly)}
                        {plan.billingCadence === "FULL_BATCH" ? "" : "/mo"}
                      </span>
                    </div>
                    <p className={staff.rowMeta}>
                      {plan.type}
                      {plan.billingCadence === "FULL_BATCH"
                        ? " · Full batch"
                        : " · Monthly"}
                      {plan.classCredits
                        ? ` · ${plan.classCredits} credits`
                        : ""}
                      {plan.active ? "" : " · Inactive"}
                    </p>
                  </div>
                </PressableCard>
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
