import { Badge } from "@dev-ui/components/badge";
import { Checkbox } from "@dev-ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import type { AgeRange, Gender } from "@/lib/constants";
import type { FamilyMemberKind } from "@/lib/use-active-student";
import { useStudioId } from "@/lib/use-studio-id";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { AGE_RANGES, GENDERS } from "@/modules/onboarding/options";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
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

type StudioBatch = {
  id: string;
  name: string;
  category: "KIDS" | "ADULTS";
  active: boolean;
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
  const { studentId, accounts, children, familyMembers } =
    useActiveStudentContext();

  const [renewTarget, setRenewTarget] = useState<Membership | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<CatalogSubscription | null>(
    null,
  );
  const [selectedAdultIds, setSelectedAdultIds] = useState<string[]>([]);
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>([]);
  const [seatBatchIds, setSeatBatchIds] = useState<Record<string, string>>({});
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberKind, setNewMemberKind] = useState<FamilyMemberKind>("KID");
  const [newMemberGender, setNewMemberGender] = useState<Gender | null>(null);
  const [newMemberAgeRange, setNewMemberAgeRange] = useState<AgeRange | null>(
    null,
  );

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

  const batchesQuery = useQuery({
    queryKey: ["batches", studioId],
    queryFn: () => api.get<StudioBatch[]>(`/batches/studio/${studioId}`),
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

  const adultCandidates = useMemo(
    () =>
      accounts.filter(
        (account) => account.isSelf || account.kind === "CO_STUDENT",
      ),
    [accounts],
  );

  const kidCandidates = useMemo(() => children, [children]);

  function openEnroll(sub: CatalogSubscription) {
    setEnrollTarget(sub);
    setSeatBatchIds({});
    if (sub.kind === "INDIVIDUAL") {
      if (sub.individualAudience === "ADULT") {
        setSelectedAdultIds([studentId]);
        setSelectedKidIds([]);
      } else {
        setSelectedAdultIds([]);
        const defaultKid = children[0]?.id ?? studentId;
        setSelectedKidIds(defaultKid ? [defaultKid] : []);
      }
      return;
    }
    setSelectedAdultIds(
      adultCandidates.slice(0, sub.adultSeats).map((a) => a.id),
    );
    setSelectedKidIds(children.slice(0, sub.kidSeats).map((c) => c.id));
  }

  const selectedSeatIds = [...selectedAdultIds, ...selectedKidIds];
  const isFamilyTarget = enrollTarget?.kind === "FAMILY";

  const seatsValid =
    enrollTarget != null &&
    selectedAdultIds.length === enrollTarget.adultSeats &&
    selectedKidIds.length === enrollTarget.kidSeats &&
    (!isFamilyTarget ||
      selectedSeatIds.every((id) => Boolean(seatBatchIds[id])));

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

  const assignMutation = useMutation({
    mutationFn: () => {
      const coveredStudents = [
        ...selectedAdultIds.map((id) => ({
          studentId: id,
          seatRole: "ADULT" as const,
          ...(isFamilyTarget ? { batchId: seatBatchIds[id] } : {}),
        })),
        ...selectedKidIds.map((id) => ({
          studentId: id,
          seatRole: "KID" as const,
          ...(isFamilyTarget ? { batchId: seatBatchIds[id] } : {}),
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
      void queryClient.invalidateQueries({
        queryKey: ["users", user?.id, "family-members"],
      });
      setEnrollTarget(null);
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string; kind: FamilyMemberKind }>(
        "/users/me/family-members",
        {
          name: newMemberName,
          kind: newMemberKind,
          gender: newMemberGender,
          ageRange: newMemberAgeRange,
        },
      ),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({
        queryKey: ["users", user?.id, "family-members"],
      });
      setNewMemberName("");
      setNewMemberGender(null);
      setNewMemberAgeRange(null);
      if (!enrollTarget) return;
      if (
        created.kind === "CO_STUDENT" &&
        selectedAdultIds.length < enrollTarget.adultSeats
      ) {
        setSelectedAdultIds((prev) => [...prev, created.id]);
      }
      if (
        created.kind === "KID" &&
        selectedKidIds.length < enrollTarget.kidSeats
      ) {
        setSelectedKidIds((prev) => [...prev, created.id]);
      }
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
            onClick={() => renewMutation.mutate()}
          >
            Request renewal
          </TouchButton>
        </div>
      </AppSheet>

      <AppSheet
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
                  Add a family member to fill kid seats.
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

          {isFamilyTarget ? (
            <div className={styles.seatBlock}>
              <p className={styles.sectionLabel}>Batch for each member</p>
              {selectedSeatIds.map((seatId) => {
                const person = accounts.find((a) => a.id === seatId);
                const isKidSeat = selectedKidIds.includes(seatId);
                const options = (batchesQuery.data ?? []).filter(
                  (batch) =>
                    batch.active &&
                    batch.category === (isKidSeat ? "KIDS" : "ADULTS"),
                );
                return (
                  <div key={`batch-${seatId}`} className={styles.batchPicker}>
                    <Select
                      label={`Batch for ${person?.name ?? "member"}`}
                      selectedKey={seatBatchIds[seatId] ?? null}
                      onSelectionChange={(key) => {
                        if (!key) return;
                        setSeatBatchIds((prev) => ({
                          ...prev,
                          [seatId]: String(key),
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((batch) => (
                          <SelectItem key={batch.id} id={batch.id}>
                            {batch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          ) : null}

          {isFamilyTarget ? (
            <div className={styles.seatBlock}>
              <p className={styles.sectionLabel}>Add family member</p>
              <FormInput
                label="Name"
                value={newMemberName}
                onChange={setNewMemberName}
                placeholder="Enter member name"
              />
              <div className={styles.kindPicker}>
                <TouchButton
                  variant={newMemberKind === "KID" ? "primary" : "quiet"}
                  size="sm"
                  onClick={() => setNewMemberKind("KID")}
                >
                  Kid
                </TouchButton>
                <TouchButton
                  variant={newMemberKind === "CO_STUDENT" ? "primary" : "quiet"}
                  size="sm"
                  onClick={() => setNewMemberKind("CO_STUDENT")}
                >
                  Co-student
                </TouchButton>
              </div>
              <div className={styles.fieldBlock}>
                <p className={styles.fieldLabel}>Gender</p>
                <div className={styles.chipGrid}>
                  {GENDERS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.chip}
                      data-selected={
                        newMemberGender === option.id ? "true" : undefined
                      }
                      onClick={() => setNewMemberGender(option.id)}
                    >
                      {option.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.fieldBlock}>
                <p className={styles.fieldLabel}>Age range</p>
                <div className={styles.chipGrid}>
                  {AGE_RANGES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.chip}
                      data-selected={
                        newMemberAgeRange === option.id ? "true" : undefined
                      }
                      onClick={() => setNewMemberAgeRange(option.id)}
                    >
                      {option.label} · {option.title}
                    </button>
                  ))}
                </div>
              </div>
              <TouchButton
                variant="quiet"
                size="sm"
                isDisabled={
                  newMemberName.trim().length === 0 ||
                  !newMemberGender ||
                  !newMemberAgeRange
                }
                isPending={createMemberMutation.isPending}
                onClick={() => createMemberMutation.mutate()}
              >
                Add member
              </TouchButton>
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
      </AppSheet>
    </Screen>
  );
}
