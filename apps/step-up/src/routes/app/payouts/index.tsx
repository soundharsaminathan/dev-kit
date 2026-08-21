import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/use-auth";
import { useStudioId } from "@/lib/use-studio-id";
import payoutsStyles from "@/modules/payouts/payouts.module.scss";
import {
  formatPayoutAmount,
  formatPayoutPeriod,
  type TrainerPayout,
} from "@/modules/payouts/types";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

export const Route = createFileRoute("/app/payouts/")({
  component: () => (
    <RequireStudioFeature feature="payouts">
      <PayoutsIndexPage />
    </RequireStudioFeature>
  ),
});

function statusTone(status: TrainerPayout["status"]) {
  if (status === "PAID") return "success" as const;
  if (status === "SENT") return "warning" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "neutral" as const;
}

function PayoutsIndexPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();

  const payouts = useQuery({
    queryKey: ["payouts", studioId],
    queryFn: () => api.get<TrainerPayout[]>(`/payouts/studio/${studioId}`),
    enabled: Boolean(studioId),
  });

  const rows = payouts.data ?? [];

  return (
    <Screen
      title="Payouts"
      subtitle={
        user?.role === "TRAINER"
          ? "Review your monthly payout slips."
          : "Prepare and track trainer payouts every month."
      }
      wide
    >
      <PullToRefresh onRefresh={() => payouts.refetch()}>
        <div className={staff.section}>
          {payouts.isError ? (
            <ErrorState
              description={
                payouts.error instanceof Error
                  ? payouts.error.message
                  : "Could not load payouts."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => payouts.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {payouts.isLoading ? <SkeletonCardList count={4} /> : null}

          {payouts.data && rows.length === 0 ? (
            <EmptyState
              title="No payouts yet"
              description={
                user?.role === "TRAINER"
                  ? "Payouts are generated on the 1st of each month after sessions are completed."
                  : "Completed sessions are grouped into draft payouts on the 1st of each month."
              }
            />
          ) : null}

          {payouts.data && rows.length > 0 ? (
            <div className={staff.attentionBody}>
              {rows.map((payout) => (
                <Link
                  key={payout.id}
                  to="/app/payouts/$payoutId"
                  params={{ payoutId: payout.id }}
                  className={payoutsStyles.payoutCard}
                  data-testid={`payout-row-${payout.id}`}
                >
                  <span className={staff.metricLabel}>
                    <span className={staff.metricIcon} aria-hidden>
                      <Icon name="wallet" />
                    </span>
                    {payout.trainerName}
                  </span>
                  <span className={payoutsStyles.payoutMeta}>
                    {formatPayoutPeriod(payout.periodStart)} ·{" "}
                    {payout.sessionCount} session
                    {payout.sessionCount === 1 ? "" : "s"}
                  </span>
                  <span className={payoutsStyles.payoutFooter}>
                    <span className={payoutsStyles.payoutAmount}>
                      {formatPayoutAmount(payout.amount)}
                    </span>
                    <span
                      className={payoutsStyles.statusChip}
                      data-tone={statusTone(payout.status)}
                    >
                      {payout.status}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
