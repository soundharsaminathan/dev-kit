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

type SubscriptionKind = "INDIVIDUAL" | "FAMILY";
type IndividualAudience = "ADULT" | "KID";
type FamilyPack =
  | "TWO_KIDS"
  | "ONE_ADULT_ONE_KID"
  | "TWO_ADULTS"
  | "ONE_ADULT_TWO_KIDS"
  | "TWO_ADULTS_ONE_KID"
  | "TWO_ADULTS_TWO_KIDS";
type BillingCadence = "MONTHLY" | "QUARTERLY";

type Subscription = {
  id: string;
  name: string;
  kind: SubscriptionKind;
  individualAudience?: IndividualAudience | null;
  familyPack?: FamilyPack | null;
  billingCadence: BillingCadence;
  price: number | string;
  adultSeats: number;
  kidSeats: number;
  active: boolean;
};

export const Route = createFileRoute("/app/subscriptions/")({
  component: SubscriptionsPage,
});

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function kindLabel(kind: SubscriptionKind) {
  return kind === "FAMILY" ? "Family" : "Individual";
}

function audienceOrPackLabel(sub: Subscription) {
  if (sub.kind === "INDIVIDUAL") {
    return sub.individualAudience === "KID" ? "Kid" : "Adult";
  }
  switch (sub.familyPack) {
    case "TWO_KIDS":
      return "2 kids";
    case "ONE_ADULT_ONE_KID":
      return "1 adult + 1 kid";
    case "TWO_ADULTS":
      return "2 adults";
    case "ONE_ADULT_TWO_KIDS":
      return "1 adult + 2 kids";
    case "TWO_ADULTS_ONE_KID":
      return "2 adults + 1 kid";
    case "TWO_ADULTS_TWO_KIDS":
      return "2 adults + 2 kids";
    default:
      return "Family";
  }
}

function cadenceSuffix(cadence: BillingCadence) {
  return cadence === "QUARTERLY" ? "/qtr" : "/mo";
}

function SubscriptionsPage() {
  const api = useApi();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["subscriptions", STUDIO_ID],
    queryFn: () =>
      api.get<Subscription[]>(`/subscriptions/studio/${STUDIO_ID}`),
  });

  return (
    <Screen
      title="Subscriptions"
      subtitle="Studio-wide membership offers students can subscribe to."
      actions={
        <TouchButton variant="primary" size="md">
          <Link to="/app/subscriptions/new">Add</Link>
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
                  : "Could not load subscriptions."
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
              title="No subscriptions yet"
              description="Create a subscription to sell memberships."
              action={
                <TouchButton variant="primary">
                  <Link to="/app/subscriptions/new">Add subscription</Link>
                </TouchButton>
              }
            />
          ) : null}

          {query.data && query.data.length > 0 ? (
            <div className={staff.list}>
              {query.data.map((subscription) => (
                <PressableCard
                  key={subscription.id}
                  onClick={() =>
                    void navigate({
                      to: "/app/subscriptions/$id",
                      params: { id: subscription.id },
                    })
                  }
                >
                  <div className={staff.rowCard}>
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>
                        {subscription.name}
                      </span>
                      <span className={staff.rowMeta}>
                        {formatPrice(Number(subscription.price))}
                        {cadenceSuffix(subscription.billingCadence)}
                      </span>
                    </div>
                    <p className={staff.rowMeta}>
                      {kindLabel(subscription.kind)} ·{" "}
                      {audienceOrPackLabel(subscription)} ·{" "}
                      {subscription.billingCadence === "QUARTERLY"
                        ? "Quarterly"
                        : "Monthly"}
                      {subscription.active ? "" : " · Inactive"}
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
