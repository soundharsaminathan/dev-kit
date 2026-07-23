import { Badge } from "@dev-ui/components/badge";
import { Checkbox } from "@dev-ui/components/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  const queryClient = useQueryClient();
  const { studentId, children, isParent } = useActiveStudentContext();

  const [renewTarget, setRenewTarget] = useState<Membership | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<CatalogSubscription | null>(
    null,
  );
  const [selectedAdultIds, setSelectedAdultIds] = useState<string[]>([]);
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>([]);

  const membershipsQuery = useQuery({
    queryKey: ["memberships", studentId],
    queryFn: () => api.get<Membership[]>(`/memberships/student/${studentId}`),
    enabled: Boolean(studentId),
  });

  const catalogQuery = useQuery({
    queryKey: ["subscriptions", STUDIO_ID],
    queryFn: () =>
      api.get<CatalogSubscription[]>(`/subscriptions/studio/${STUDIO_ID}`),
    enabled: Boolean(user),
  });

  const activeSubscriptionIds = new Set(
    (membershipsQuery.data ?? [])
      .filter((m) => m.status === "ACTIVE")
      .map((m) => m.subscription?.id)
      .filter(Boolean),
  );

  const available = (catalogQuery.data ?? []).filter((s) => s.active);
  const individual = available.filter((s) => s.kind === "INDIVIDUAL");
  const family = available.filter((s) => s.kind === "FAMILY");

  const adultCandidates = useMemo(() => {
    if (!user) return [];
    if (isParent) {
      return [{ id: user.id, name: user.name ?? "Me (parent)" }];
    }
    return [{ id: user.id, name: user.name ?? "Me" }];
  }, [isParent, user]);

  const kidCandidates = useMemo(() => {
    if (isParent) return children;
    return user ? [{ id: user.id, name: user.name ?? "Me" }] : [];
  }, [children, isParent, user]);

  function openEnroll(sub: CatalogSubscription) {
    setEnrollTarget(sub);
    if (sub.kind === "INDIVIDUAL") {
      if (sub.individualAudience === "ADULT") {
        setSelectedAdultIds([user?.id ?? studentId]);
        setSelectedKidIds([]);
      } else {
        setSelectedAdultIds([]);
        setSelectedKidIds([studentId]);
      }
      return;
    }
    setSelectedAdultIds(
      sub.adultSeats > 0 && user ? [user.id].slice(0, sub.adultSeats) : [],
    );
    setSelectedKidIds(children.slice(0, sub.kidSeats).map((c) => c.id));
  }

  const seatsValid =
    enrollTarget != null &&
    selectedAdultIds.length === enrollTarget.adultSeats &&
    selectedKidIds.length === enrollTarget.kidSeats;

  const renewMutation = useMutation({
    mutationFn: () =>
      api.post("/memberships/self/renew", {
        membershipId: renewTarget!.id,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["memberships", studentId],
      });
      setRenewTarget(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => {
      const coveredStudents = [
        ...selectedAdultIds.map((id) => ({
          studentId: id,
          seatRole: "ADULT" as const,
        })),
        ...selectedKidIds.map((id) => ({
          studentId: id,
          seatRole: "KID" as const,
        })),
      ];
      return api.post("/memberships/self/assign", {
        subscriptionId: enrollTarget!.id,
        purchaserUserId: user!.id,
        coveredStudents,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["memberships", studentId],
      });
      setEnrollTarget(null);
    },
  });

  async function refetchAll() {
    await Promise.all([membershipsQuery.refetch(), catalogQuery.refetch()]);
  }

  function renderCatalog(items: CatalogSubscription[], label: string) {
    if (items.length === 0) return null;
    return (
      <>
        <p className={styles.sectionLabel}>{label}</p>
        <div className={styles.list}>
          {items.map((sub) => (
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
                    onClick={() => openEnroll(sub)}
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
    );
  }

  return (
    <Screen
      title="Subscriptions"
      subtitle="Membership status and renewal dates."
      showBack
      backTo="/me"
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
            description="Browse subscriptions below to enroll."
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
                {membership.status === "DUE" ||
                membership.status === "EXPIRED" ? (
                  <div>
                    <TouchButton
                      variant="primary"
                      size="sm"
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

        {renderCatalog(individual, "Individual")}
        {renderCatalog(family, "Family")}
      </PullToRefresh>

      <AppBottomSheet
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
        title="Subscribe"
      >
        <div className={styles.sheetBody}>
          <p className={styles.sheetDesc}>
            Subscribe to <strong>{enrollTarget?.name}</strong>
            {enrollTarget
              ? ` for ${formatPrice(enrollTarget.price, enrollTarget.billingCadence)}`
              : ""}
            .
          </p>

          {enrollTarget && enrollTarget.adultSeats > 0 ? (
            <div className={styles.seatBlock}>
              <p className={styles.sectionLabel}>
                Adults ({selectedAdultIds.length}/{enrollTarget.adultSeats})
              </p>
              {adultCandidates.map((person) => (
                <Checkbox
                  key={person.id}
                  isSelected={selectedAdultIds.includes(person.id)}
                  onChange={(isSelected) => {
                    if (isSelected) {
                      if (
                        selectedAdultIds.includes(person.id) ||
                        selectedAdultIds.length >= enrollTarget.adultSeats
                      ) {
                        return;
                      }
                      setSelectedAdultIds([...selectedAdultIds, person.id]);
                      return;
                    }
                    setSelectedAdultIds(
                      selectedAdultIds.filter((x) => x !== person.id),
                    );
                  }}
                >
                  {person.name}
                </Checkbox>
              ))}
            </div>
          ) : null}

          {enrollTarget && enrollTarget.kidSeats > 0 ? (
            <div className={styles.seatBlock}>
              <p className={styles.sectionLabel}>
                Kids ({selectedKidIds.length}/{enrollTarget.kidSeats})
              </p>
              {kidCandidates.length === 0 ? (
                <p className={styles.sheetDesc}>
                  Link a child account to fill kid seats.
                </p>
              ) : (
                kidCandidates.map((person) => (
                  <Checkbox
                    key={person.id}
                    isSelected={selectedKidIds.includes(person.id)}
                    onChange={(isSelected) => {
                      if (isSelected) {
                        if (
                          selectedKidIds.includes(person.id) ||
                          selectedKidIds.length >= enrollTarget.kidSeats
                        ) {
                          return;
                        }
                        setSelectedKidIds([...selectedKidIds, person.id]);
                        return;
                      }
                      setSelectedKidIds(
                        selectedKidIds.filter((x) => x !== person.id),
                      );
                    }}
                  >
                    {person.name}
                  </Checkbox>
                ))
              )}
            </div>
          ) : null}

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
            isDisabled={!seatsValid}
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
