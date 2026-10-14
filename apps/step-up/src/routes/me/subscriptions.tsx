import { Badge } from "@dev-ui/components/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { useStudioId } from "@/lib/use-studio-id";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { AppSheet } from "@/modules/ui/app-sheet";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./subscriptions.module.scss";

type SeatRole = "ADULT" | "KID";

type CatalogSubscription = {
  id: string;
  name: string;
  kind: "INDIVIDUAL" | "FAMILY";
  individualAudience?: "ADULT" | "KID" | null;
  familyPack?: string | null;
  billingCadence: "MONTHLY" | "QUARTERLY";
  adultSeats: number;
  kidSeats: number;
  price: number | string;
  active: boolean;
};

type Membership = {
  id: string;
  status: "ACTIVE" | "DUE" | "EXPIRED" | string;
  periodEnd: string;
  subscription?: CatalogSubscription;
  coveredStudents?: Array<{ studentId: string; seatRole: SeatRole }>;
};

export const Route = createFileRoute("/me/subscriptions")({
  component: MeSubscriptionsPage,
});

function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "DUE") return "warning";
  if (status === "EXPIRED") return "danger";
  return "neutral";
}

function formatPrice(price: number | string, cadence: string) {
  const amount = Number(price);
  const suffix = cadence === "QUARTERLY" ? "/qtr" : "/mo";
  return `₹${Number.isFinite(amount) ? amount : price}${suffix}`;
}

function kindLabel(sub: CatalogSubscription) {
  if (sub.kind === "INDIVIDUAL") {
    return `Individual · ${sub.individualAudience === "ADULT" ? "Adult" : "Kid"}`;
  }
  return `Family · ${(sub.familyPack ?? "").replaceAll("_", " ").toLowerCase()}`;
}

function MeSubscriptionsPage() {
  const { user } = useAuth();
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { studentId, accounts, familyMembers } = useActiveStudentContext();

  const [renewTarget, setRenewTarget] = useState<Membership | null>(null);

  const membershipsQuery = useQuery({
    queryKey: ["memberships", studentId],
    queryFn: () => api.get<Membership[]>(`/memberships/student/${studentId}`),
    enabled: Boolean(studentId),
  });

  const catalogQuery = useQuery({
    queryKey: ["subscriptions", studioId],
    queryFn: () =>
      api.get<CatalogSubscription[]>(`/subscriptions/studio/${studioId}`),
    enabled: Boolean(user),
  });

  const activeSubscriptionIds = new Set(
    (membershipsQuery.data ?? [])
      .filter((m) => m.status === "ACTIVE")
      .map((m) => m.subscription?.id)
      .filter(Boolean),
  );

  const individual = (catalogQuery.data ?? []).filter(
    (s) => s.active && s.kind === "INDIVIDUAL",
  );

  const renewMutation = useMutation({
    mutationFn: () =>
      api.post("/memberships/self/renew", {
        membershipId: renewTarget!.id,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["memberships", studentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["invoices", "student", studentId],
        }),
      ]);
      setRenewTarget(null);
      void navigate({ to: "/me/invoices" });
    },
  });

  async function refetchAll() {
    await Promise.all([membershipsQuery.refetch(), catalogQuery.refetch()]);
  }

  return (
    <Screen
      title="Subscriptions"
      subtitle="Membership status and renewal dates."
      showBack
      backTo="/me/profile"
    >
      <PullToRefresh onRefresh={refetchAll}>
        {membershipsQuery.isLoading ? <SkeletonCardList count={2} /> : null}

        {membershipsQuery.isError ? (
          <ErrorState
            description={
              membershipsQuery.error instanceof Error
                ? membershipsQuery.error.message
                : "Could not load subscriptions."
            }
            action={
              <TouchButton
                variant="primary"
                onClick={() => membershipsQuery.refetch()}
              >
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {!membershipsQuery.isLoading &&
        !membershipsQuery.isError &&
        (!membershipsQuery.data || membershipsQuery.data.length === 0) ? (
          <EmptyState
            title="No memberships"
            description="Find a class to enroll with an individual plan."
          />
        ) : null}

        {membershipsQuery.data && membershipsQuery.data.length > 0 ? (
          <div className={styles.list}>
            {membershipsQuery.data.map((membership) => (
              <div key={membership.id} className={styles.row}>
                <div className={styles.rowTop}>
                  <div>
                    <p className={styles.rowTitle}>
                      {membership.subscription?.name ?? "Membership"}
                    </p>
                    <p className={styles.rowType}>
                      {membership.subscription
                        ? kindLabel(membership.subscription)
                        : "Subscription"}
                    </p>
                  </div>
                  <Badge variant={statusVariant(membership.status)}>
                    {membership.status}
                  </Badge>
                </div>
                <div className={styles.rowMeta}>
                  <span>
                    {membership.status === "ACTIVE" ? "Renews" : "Expired"}{" "}
                    {new Date(membership.periodEnd).toLocaleDateString()}
                  </span>
                  {membership.subscription ? (
                    <span className={styles.price}>
                      {formatPrice(
                        membership.subscription.price,
                        membership.subscription.billingCadence,
                      )}
                    </span>
                  ) : null}
                </div>
                {membership.coveredStudents &&
                membership.coveredStudents.length > 0 ? (
                  <div className={styles.coveredList}>
                    {membership.coveredStudents.map((seat) => {
                      const person =
                        accounts.find((a) => a.id === seat.studentId) ??
                        familyMembers.find((m) => m.id === seat.studentId);
                      return (
                        <span
                          key={`${membership.id}-${seat.studentId}`}
                          className={styles.coveredChip}
                        >
                          {person?.name ?? "Member"} ·{" "}
                          {seat.seatRole === "ADULT" ? "Adult" : "Kid"}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
                {membership.status === "DUE" ||
                membership.status === "EXPIRED" ? (
                  <div>
                    <TouchButton
                      variant="primary"
                      size="sm"
                      data-testid={`renew-membership-${membership.id}`}
                      onClick={() => setRenewTarget(membership)}
                    >
                      Renew
                    </TouchButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {individual.length > 0 ? (
          <>
            <p className={styles.sectionLabel}>Individual</p>
            <div className={styles.list}>
              {individual.map((sub) => (
                <div key={sub.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div>
                      <p className={styles.rowTitle}>{sub.name}</p>
                      <p className={styles.rowType}>
                        {kindLabel(sub)} · {sub.billingCadence.toLowerCase()}
                      </p>
                    </div>
                    <span className={styles.price}>
                      {formatPrice(sub.price, sub.billingCadence)}
                    </span>
                  </div>
                  {!activeSubscriptionIds.has(sub.id) ? (
                    <div>
                      <TouchButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          void navigate({ to: "/me/book" });
                        }}
                      >
                        Find a class
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

      <AppSheet
        isOpen={Boolean(renewTarget)}
        onOpenChange={(open) => {
          if (!open) setRenewTarget(null);
        }}
        title="Renew subscription"
      >
        <div className={styles.sheetBody}>
          <p className={styles.sheetDesc}>
            Renew{" "}
            <strong>
              {renewTarget?.subscription?.name ?? "your subscription"}
            </strong>
            {renewTarget?.subscription
              ? ` at ${formatPrice(renewTarget.subscription.price, renewTarget.subscription.billingCadence)}`
              : ""}
            . This creates an invoice — pay at the front desk to activate the
            renewed plan.
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
            data-testid="confirm-renew-subscription"
            onClick={() => renewMutation.mutate()}
          >
            Request renewal
          </TouchButton>
        </div>
      </AppSheet>
    </Screen>
  );
}
