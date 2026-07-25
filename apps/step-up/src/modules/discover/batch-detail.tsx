import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { Checkbox } from "@dev-ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { BatchRatingInput } from "@/modules/discover/batch-rating";
import type { DiscoverBatchPlan } from "@/modules/discover/types";
import { useDiscoverBatch } from "@/modules/discover/use-discover";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { BloomMenu } from "@/modules/ui/bloom-menu";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { ErrorState, SuccessState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import styles from "./batch-detail.module.scss";

type StudioBatch = {
  id: string;
  name: string;
  category: "KIDS" | "ADULTS";
  active: boolean;
};

function formatPrice(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function planPriceLabel(plan: DiscoverBatchPlan) {
  const amount = formatPrice(plan.price) ?? `₹${plan.price}`;
  return plan.billingCadence === "QUARTERLY"
    ? `${amount}/3 mo`
    : `${amount}/mo`;
}

function planCadenceLabel(plan: DiscoverBatchPlan) {
  return plan.billingCadence === "MONTHLY" ? "1 month" : "3 months";
}

function planAudienceLabel(plan: DiscoverBatchPlan) {
  if (plan.kind === "INDIVIDUAL") {
    return plan.individualAudience === "ADULT" ? "Adult" : "Kid";
  }
  return "Family";
}

function planSeatShortLabel(plan: DiscoverBatchPlan) {
  const parts: string[] = [];
  if (plan.adultSeats > 0) parts.push(`${plan.adultSeats}A`);
  if (plan.kidSeats > 0) parts.push(`${plan.kidSeats}K`);
  return parts.join(" · ") || "Family";
}

function planSeatA11yLabel(plan: DiscoverBatchPlan) {
  const parts: string[] = [];
  if (plan.adultSeats > 0) {
    parts.push(`${plan.adultSeats} adult${plan.adultSeats === 1 ? "" : "s"}`);
  }
  if (plan.kidSeats > 0) {
    parts.push(`${plan.kidSeats} kid${plan.kidSeats === 1 ? "" : "s"}`);
  }
  return parts.join(" + ") || "Family";
}

function planKindLabel(plan: DiscoverBatchPlan) {
  if (plan.kind === "INDIVIDUAL") {
    return `Individual · ${planAudienceLabel(plan)}`;
  }
  return `Family · ${planSeatA11yLabel(plan)}`;
}

function sortPlans(a: DiscoverBatchPlan, b: DiscoverBatchPlan) {
  const cadenceRank = (plan: DiscoverBatchPlan) =>
    plan.billingCadence === "MONTHLY" ? 0 : 1;
  const audienceRank = (plan: DiscoverBatchPlan) =>
    plan.individualAudience === "ADULT" ? 0 : 1;
  return (
    cadenceRank(a) - cadenceRank(b) ||
    audienceRank(a) - audienceRank(b) ||
    a.name.localeCompare(b.name)
  );
}

export function BatchDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const api = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const {
    studentId,
    loading: studentLoading,
    accounts,
    children,
  } = useActiveStudentContext();
  const query = useDiscoverBatch(id, studentId || undefined);

  const [bookOpen, setBookOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DiscoverBatchPlan | null>(
    null,
  );
  const [selectedAdultIds, setSelectedAdultIds] = useState<string[]>([]);
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>([]);
  const [seatBatchIds, setSeatBatchIds] = useState<Record<string, string>>({});
  const [type, setType] = useState<"TRIAL" | "OPEN_SEAT" | "PRIVATE">("TRIAL");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const trainerId = query.data?.trainers[0]?.trainer.id;
  const canActForStudent = Boolean(studentId) && !studentLoading;

  const studioBatches = useQuery({
    queryKey: ["batches", STUDIO_ID, "purchase-picks"],
    queryFn: () => api.get<StudioBatch[]>(`/batches/studio/${STUDIO_ID}`),
    enabled: purchaseOpen && selectedPlan?.kind === "FAMILY",
  });

  const adultCandidates = useMemo(
    () =>
      accounts.filter(
        (account) => account.isSelf || account.kind === "CO_STUDENT",
      ),
    [accounts],
  );
  const kidCandidates = useMemo(() => children, [children]);

  const createBooking = useMutation({
    mutationFn: () => {
      if (!studentId) {
        throw new Error("Select a student before booking.");
      }
      return api.post<{
        id: string;
        status: string;
      }>("/bookings", {
        studioId: STUDIO_ID,
        studentId,
        type,
        batchId: id,
        notes: notes || undefined,
        trainerId: type === "PRIVATE" ? trainerId : undefined,
      });
    },
    onSuccess: (booking) => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["bookings", "student", studentId],
        }),
        queryClient.invalidateQueries({ queryKey: ["batches", id] }),
      ]);
      setBookOpen(false);
      setNotes("");
      if (booking.status === "AWAITING_PAYMENT") {
        void navigate({
          to: "/me/checkout/$bookingId",
          params: { bookingId: booking.id },
        });
        return;
      }
      setSuccess(true);
    },
  });

  const enroll = useMutation({
    mutationFn: () => {
      if (!studentId) {
        throw new Error("Select a student before joining.");
      }
      return api.post(`/batches/${id}/enroll`, { studentId });
    },
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batches", id] }),
        queryClient.invalidateQueries({
          queryKey: ["batches", "discover", STUDIO_ID],
        }),
      ]);
      setEnrollOpen(false);
      setEnrollSuccess(true);
    },
  });

  const purchase = useMutation({
    mutationFn: () => {
      if (!user || !selectedPlan) {
        throw new Error("Select a plan to continue.");
      }
      const coveredStudents = [
        ...selectedAdultIds.map((studentSeatId) => ({
          studentId: studentSeatId,
          seatRole: "ADULT" as const,
          ...(seatBatchIds[studentSeatId]
            ? { batchId: seatBatchIds[studentSeatId] }
            : {}),
        })),
        ...selectedKidIds.map((studentSeatId) => ({
          studentId: studentSeatId,
          seatRole: "KID" as const,
          ...(seatBatchIds[studentSeatId]
            ? { batchId: seatBatchIds[studentSeatId] }
            : {}),
        })),
      ];
      return api.post(`/batches/${id}/purchase`, {
        subscriptionId: selectedPlan.id,
        purchaserUserId: user.id,
        coveredStudents,
      });
    },
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batches", id] }),
        queryClient.invalidateQueries({
          queryKey: ["batches", "discover", STUDIO_ID],
        }),
        queryClient.invalidateQueries({
          queryKey: ["memberships", studentId],
        }),
      ]);
      setPurchaseOpen(false);
      setSelectedPlan(null);
      setPurchaseSuccess(true);
    },
  });

  const rateBatch = useMutation({
    mutationFn: (rating: number) =>
      api.post(`/batches/${id}/rate`, { studentId, rating }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batches", id] }),
        queryClient.invalidateQueries({
          queryKey: ["batches", "discover", STUDIO_ID],
        }),
      ]);
    },
  });

  function openPurchase(plan: DiscoverBatchPlan) {
    setSelectedPlan(plan);
    setSeatBatchIds({});
    if (plan.kind === "INDIVIDUAL") {
      if (plan.individualAudience === "ADULT") {
        setSelectedAdultIds([studentId]);
        setSelectedKidIds([]);
      } else {
        setSelectedAdultIds([]);
        const defaultKid = children[0]?.id ?? studentId;
        setSelectedKidIds(defaultKid ? [defaultKid] : []);
      }
    } else {
      setSelectedAdultIds(
        adultCandidates.slice(0, plan.adultSeats).map((account) => account.id),
      );
      setSelectedKidIds(
        children.slice(0, plan.kidSeats).map((child) => child.id),
      );
    }
    setPurchaseOpen(true);
  }

  if (query.isLoading) {
    return (
      <Screen title="Class" showBack backTo="/me/book">
        <SkeletonBlock height="14rem" radius="var(--radius-2xl)" />
        <SkeletonBlock height="1.5rem" width="60%" />
        <SkeletonBlock height="1rem" width="40%" />
        <SkeletonBlock height="6rem" />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen title="Class" showBack backTo="/me/book">
        <ErrorState
          description={
            query.error instanceof Error
              ? query.error.message
              : "Class not found."
          }
        />
      </Screen>
    );
  }

  const batch = query.data;
  const trainer = batch.trainers[0]?.trainer;
  const plans = (batch.plans ?? []).filter((plan) => plan.active);
  const individualPlans = plans
    .filter((plan) => plan.kind === "INDIVIDUAL")
    .slice()
    .sort(sortPlans);
  const familyPlans = plans
    .filter((plan) => plan.kind === "FAMILY")
    .slice()
    .sort(sortPlans);
  const hasPlans = plans.length > 0;
  const batchSeatRole = batch.category === "KIDS" ? "KID" : "ADULT";
  const ageGroupLabel = batch.category === "KIDS" ? "Kids" : "Adults";
  const price = formatPrice(batch.price);
  const isFull = batch.remainingSeats === 0;
  const plansDisabled = isFull || !canActForStudent;
  const seatsLabel =
    batch.remainingSeats == null
      ? null
      : batch.remainingSeats === 0
        ? "Class full"
        : `${batch.remainingSeats} seat${batch.remainingSeats === 1 ? "" : "s"} left`;
  const capacityLabel = `${batch.capacity} capacity`;
  const familyBloomItems = familyPlans.map((plan) => ({
    id: plan.id,
    label: `${planSeatShortLabel(plan)} · ${planPriceLabel(plan)}`,
    icon: "users" as const,
  }));
  const openBooking = batch.viewerBooking;
  const hasAwaitingPayment = openBooking?.status === "AWAITING_PAYMENT";
  const hasPendingRequest = openBooking?.status === "PENDING";
  const hasConfirmedRequest =
    openBooking?.status === "CONFIRMED" && !batch.viewerEnrolled;
  const showBookingCta =
    !batch.viewerEnrolled &&
    !hasAwaitingPayment &&
    !hasPendingRequest &&
    !hasConfirmedRequest;

  const otherSeatRole = batchSeatRole === "KID" ? "ADULT" : "KID";
  const otherSeatIds =
    otherSeatRole === "ADULT" ? selectedAdultIds : selectedKidIds;
  const otherBatches = (studioBatches.data ?? []).filter(
    (entry) =>
      entry.active &&
      entry.id !== id &&
      entry.category === (otherSeatRole === "KID" ? "KIDS" : "ADULTS"),
  );

  const seatsValid =
    selectedPlan != null &&
    selectedAdultIds.length === selectedPlan.adultSeats &&
    selectedKidIds.length === selectedPlan.kidSeats &&
    (selectedPlan.kind !== "FAMILY" ||
      otherSeatIds.every((seatId) => Boolean(seatBatchIds[seatId])));

  if (enrollSuccess || purchaseSuccess) {
    return (
      <Screen title="Enrolled" showBack backTo="/me/book">
        <SuccessState
          title="You're enrolled"
          description="You've joined this class. Check your calendar for upcoming sessions."
          action={
            <div className={styles.successActions}>
              <TouchButton variant="primary" fullWidth>
                <Link
                  to="/me/calendar"
                  search={{ view: "week", focus: new Date().toISOString() }}
                >
                  Open calendar
                </Link>
              </TouchButton>
              <TouchButton
                variant="quiet"
                fullWidth
                onClick={() => {
                  setEnrollSuccess(false);
                  setPurchaseSuccess(false);
                }}
              >
                Back to class
              </TouchButton>
            </div>
          }
        />
      </Screen>
    );
  }

  if (success) {
    return (
      <Screen title="Booked" showBack backTo="/me/book">
        <SuccessState
          title="Request sent"
          description="The studio will confirm your booking. Track status under My bookings."
          action={
            <div className={styles.successActions}>
              <TouchButton variant="primary" fullWidth>
                <Link to="/me/bookings">View my bookings</Link>
              </TouchButton>
              <TouchButton
                variant="quiet"
                fullWidth
                onClick={() => setSuccess(false)}
              >
                Back to class
              </TouchButton>
            </div>
          }
        />
      </Screen>
    );
  }

  return (
    <>
      <Screen
        title={batch.name}
        {...(batch.scheduleLabel ? { subtitle: batch.scheduleLabel } : {})}
        showBack
        backTo="/me/book"
        paddedCta={
          showBookingCta ||
          hasAwaitingPayment ||
          hasPendingRequest ||
          hasConfirmedRequest
        }
      >
        <div className={styles.hero}>
          {batch.coverImageUrl ? (
            <img
              src={batch.coverImageUrl}
              alt=""
              className={styles.heroImg}
              loading="lazy"
            />
          ) : (
            <div className={styles.heroFallback} aria-hidden>
              <Icon name={ENTITY_ICONS.batch} className={styles.heroIcon} />
            </div>
          )}
          {batch.styleBadge ? (
            <Badge className={styles.badge}>{batch.styleBadge}</Badge>
          ) : null}
        </div>

        {hasAwaitingPayment || hasPendingRequest || hasConfirmedRequest ? (
          <div
            className={styles.requestStatus}
            data-status={openBooking?.status}
          >
            <div>
              <p className={styles.requestEyebrow}>
                {hasAwaitingPayment
                  ? "Payment required"
                  : hasPendingRequest
                    ? "Request pending"
                    : "Request confirmed"}
              </p>
              <p className={styles.requestTitle}>
                {hasAwaitingPayment
                  ? "Complete checkout to hold your seat"
                  : hasPendingRequest
                    ? "Waiting for studio approval"
                    : "Your booking is confirmed"}
              </p>
              <p className={styles.muted}>
                {openBooking?.type.replaceAll("_", " ")}
                {openBooking?.notes ? ` · ${openBooking.notes}` : ""}
                {hasAwaitingPayment
                  ? ". Your seat is held for 30 seconds — finish payment before the timer ends."
                  : hasPendingRequest
                    ? ". The studio will confirm your spot — track updates under My bookings."
                    : ". Check My bookings for the confirmed time."}
              </p>
            </div>
            <Badge
              appearance="subtle"
              variant={
                hasAwaitingPayment
                  ? "info"
                  : hasPendingRequest
                    ? "warning"
                    : "success"
              }
            >
              {openBooking?.status}
            </Badge>
          </div>
        ) : null}

        <div className={styles.stats}>
          {batch.ratingAvg != null && batch.ratingAvg > 0 ? (
            <span className={styles.stat}>
              <Icon name="star" />
              {batch.ratingAvg.toFixed(1)}
              {batch.ratingCount ? ` (${batch.ratingCount})` : ""}
            </span>
          ) : null}
          {batch.durationMinutes ? (
            <span className={styles.stat}>{batch.durationMinutes} min</span>
          ) : null}
          {seatsLabel ? (
            <span
              className={styles.stat}
              data-full={isFull ? "true" : undefined}
            >
              {seatsLabel}
            </span>
          ) : null}
          {price ? <span className={styles.price}>from {price}</span> : null}
        </div>

        {hasPlans && !batch.viewerEnrolled ? (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Choose a plan</h2>
            <div className={styles.planFacts}>
              <span className={styles.planFact}>{ageGroupLabel}</span>
              <span className={styles.planFact}>{capacityLabel}</span>
              {batch.durationMinutes ? (
                <span className={styles.planFact}>
                  {batch.durationMinutes} min
                </span>
              ) : null}
              {seatsLabel ? (
                <span
                  className={styles.planFact}
                  data-full={isFull ? "true" : undefined}
                >
                  {seatsLabel}
                </span>
              ) : null}
            </div>
            {individualPlans.length > 0 ? (
              <div className={styles.planList}>
                {individualPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className={styles.planCard}
                    disabled={plansDisabled}
                    aria-label={`${planAudienceLabel(plan)}, ${planCadenceLabel(plan)}, ${planPriceLabel(plan)}`}
                    onClick={() => openPurchase(plan)}
                  >
                    <div className={styles.planCopy}>
                      <span className={styles.planPrice}>
                        {planPriceLabel(plan)}
                      </span>
                      <span className={styles.planChips}>
                        <span className={styles.planChip}>
                          {planCadenceLabel(plan)}
                        </span>
                        <span className={styles.planChip} data-tone="accent">
                          {planAudienceLabel(plan)}
                        </span>
                      </span>
                    </div>
                    <Icon
                      name="chevron-right"
                      className={styles.planChevron}
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
            ) : null}
            {familyPlans.length > 0 ? (
              isMobile ? (
                <div className={styles.familyBloom}>
                  <BloomMenu
                    items={familyBloomItems}
                    columns={familyBloomItems.length <= 2 ? 1 : 2}
                    size="compact"
                    tone="quiet"
                    disabled={plansDisabled}
                    triggerLabel="Family packs"
                    triggerIcon="users"
                    panelTitle="Family packs"
                    description="Cover multiple seats with one subscription."
                    onSelect={(planId) => {
                      const plan = familyPlans.find(
                        (entry) => entry.id === planId,
                      );
                      if (plan) openPurchase(plan);
                    }}
                  />
                </div>
              ) : (
                <div className={styles.familyDesktop}>
                  <h3 className={styles.planGroupTitle}>Family packs</h3>
                  <div className={styles.planList}>
                    {familyPlans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        className={styles.planCard}
                        disabled={plansDisabled}
                        aria-label={`${planSeatA11yLabel(plan)}, ${planCadenceLabel(plan)}, ${planPriceLabel(plan)}`}
                        onClick={() => openPurchase(plan)}
                      >
                        <div className={styles.planCopy}>
                          <span className={styles.planPrice}>
                            {planPriceLabel(plan)}
                          </span>
                          <span className={styles.planChips}>
                            <span className={styles.planChip}>
                              {planCadenceLabel(plan)}
                            </span>
                            <span
                              className={styles.planChip}
                              data-tone="accent"
                            >
                              {planSeatShortLabel(plan)}
                            </span>
                          </span>
                        </div>
                        <Icon
                          name="chevron-right"
                          className={styles.planChevron}
                          aria-hidden
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : null}
          </div>
        ) : null}

        {batch.viewerEnrolled ? (
          <div className={styles.ratingSection}>
            <div>
              <h2 className={styles.sectionTitle}>Your rating</h2>
              <p className={styles.muted}>
                {batch.viewerRating
                  ? "Tap a star to update your rating."
                  : "How was this class? Share your experience."}
              </p>
            </div>
            <BatchRatingInput
              value={batch.viewerRating ?? null}
              onChange={(rating) => rateBatch.mutate(rating)}
              isPending={rateBatch.isPending}
            />
            {rateBatch.isError ? (
              <p className={styles.ratingError}>
                {rateBatch.error instanceof Error
                  ? rateBatch.error.message
                  : "Could not save your rating."}
              </p>
            ) : null}
          </div>
        ) : null}

        {trainer ? (
          <div className={styles.trainer}>
            <Avatar size="md" className={styles.trainerAvatar}>
              {trainer.photoUrl ? (
                <AvatarImage src={trainer.photoUrl} alt={trainer.name} />
              ) : null}
              <AvatarFallback>
                {trainer.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className={styles.trainerLabel}>Instructor</p>
              <p className={styles.trainerName}>{trainer.name}</p>
            </div>
          </div>
        ) : null}

        {batch.branch ? (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Location</h2>
            <p>{batch.branch.name}</p>
            {batch.branch.address ? (
              <p className={styles.muted}>{batch.branch.address}</p>
            ) : null}
          </div>
        ) : null}

        {batch.danceCategories && batch.danceCategories.length > 0 ? (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Styles</h2>
            <ul className={styles.styleList}>
              {batch.danceCategories.map((cat) => (
                <li key={cat.name}>
                  <strong>{cat.name}</strong>
                  {cat.description ? (
                    <span className={styles.muted}> — {cat.description}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Styles</h2>
            <p className={styles.muted}>
              {batch.styleBadge ? `${batch.styleBadge} — ` : ""}
              This class has no detailed style breakdown yet. Browse other
              classes to compare styles, levels, and schedules.
            </p>
            <TouchButton variant="quiet" fullWidth>
              <Link to="/me/book">Explore more classes</Link>
            </TouchButton>
          </div>
        )}

        {batch.sessions && batch.sessions.length > 0 ? (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Upcoming sessions</h2>
            <ul className={styles.sessionList}>
              {batch.sessions.slice(0, 5).map((session) => (
                <li key={session.id} className={styles.sessionItem}>
                  {new Date(session.startsAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Screen>

      {hasAwaitingPayment ? (
        <StickyCtaBar>
          <TouchButton variant="primary" fullWidth>
            <Link
              to="/me/checkout/$bookingId"
              params={{ bookingId: openBooking!.id }}
            >
              Continue to payment
            </Link>
          </TouchButton>
        </StickyCtaBar>
      ) : hasPendingRequest || hasConfirmedRequest ? (
        <StickyCtaBar>
          <TouchButton variant="primary" fullWidth>
            <Link to="/me/bookings">View request status</Link>
          </TouchButton>
        </StickyCtaBar>
      ) : showBookingCta ? (
        <StickyCtaBar>
          {isFull ? (
            <TouchButton variant="primary" fullWidth isDisabled>
              Class is full
            </TouchButton>
          ) : hasPlans ? (
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!canActForStudent}
              onClick={() => {
                const first = plans[0];
                if (first) openPurchase(first);
              }}
            >
              Choose a plan
            </TouchButton>
          ) : batch.enrollmentMode === "SELF_JOIN" ? (
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!canActForStudent}
              data-testid="book-class-cta"
              onClick={() => setEnrollOpen(true)}
            >
              Join this class
            </TouchButton>
          ) : (
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!canActForStudent}
              data-testid="book-class-cta"
              onClick={() => setBookOpen(true)}
            >
              Book this class
            </TouchButton>
          )}
        </StickyCtaBar>
      ) : null}

      <AppBottomSheet
        isOpen={purchaseOpen}
        onOpenChange={(open) => {
          setPurchaseOpen(open);
          if (!open) setSelectedPlan(null);
        }}
        title={selectedPlan ? selectedPlan.name : "Choose a plan"}
      >
        <div className={styles.bookForm}>
          {selectedPlan ? (
            <>
              <p className={styles.muted}>
                {planKindLabel(selectedPlan)} · {planPriceLabel(selectedPlan)}
              </p>
              {selectedPlan.kind === "FAMILY" ? (
                <>
                  {selectedPlan.adultSeats > 0 ? (
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>Adult seats</h3>
                      {adultCandidates.map((account) => (
                        <Checkbox
                          key={account.id}
                          isSelected={selectedAdultIds.includes(account.id)}
                          onChange={(selected) =>
                            setSelectedAdultIds((current) =>
                              selected
                                ? [...current, account.id].slice(
                                    0,
                                    selectedPlan.adultSeats,
                                  )
                                : current.filter(
                                    (entry) => entry !== account.id,
                                  ),
                            )
                          }
                        >
                          {account.name}
                        </Checkbox>
                      ))}
                    </div>
                  ) : null}
                  {selectedPlan.kidSeats > 0 ? (
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>Kid seats</h3>
                      {kidCandidates.map((child) => (
                        <Checkbox
                          key={child.id}
                          isSelected={selectedKidIds.includes(child.id)}
                          onChange={(selected) =>
                            setSelectedKidIds((current) =>
                              selected
                                ? [...current, child.id].slice(
                                    0,
                                    selectedPlan.kidSeats,
                                  )
                                : current.filter((entry) => entry !== child.id),
                            )
                          }
                        >
                          {child.name}
                        </Checkbox>
                      ))}
                    </div>
                  ) : null}
                  {otherSeatIds.length > 0 ? (
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>
                        Other batch for{" "}
                        {otherSeatRole === "ADULT" ? "adults" : "kids"}
                      </h3>
                      {otherSeatIds.map((seatId) => {
                        const label =
                          [...adultCandidates, ...kidCandidates].find(
                            (entry) => entry.id === seatId,
                          )?.name ?? seatId;
                        return (
                          <Select
                            key={seatId}
                            label={label}
                            selectedKey={seatBatchIds[seatId] ?? null}
                            onSelectionChange={(key) =>
                              setSeatBatchIds((current) => ({
                                ...current,
                                [seatId]: key as string,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {otherBatches.map((entry) => (
                                <SelectItem key={entry.id} id={entry.id}>
                                  {entry.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className={styles.muted}>
                  Enrolls the selected student into{" "}
                  <strong>{batch.name}</strong> for this plan period.
                </p>
              )}
              {purchase.isError ? (
                <ErrorState
                  description={
                    purchase.error instanceof Error
                      ? purchase.error.message
                      : "Could not complete purchase."
                  }
                />
              ) : null}
              <TouchButton
                variant="primary"
                fullWidth
                isDisabled={!canActForStudent || !seatsValid}
                isPending={purchase.isPending}
                onClick={() => purchase.mutate()}
              >
                Enroll with this plan
              </TouchButton>
            </>
          ) : null}
        </div>
      </AppBottomSheet>

      <AppBottomSheet
        isOpen={enrollOpen}
        onOpenChange={setEnrollOpen}
        title="Join this class"
      >
        <div className={styles.bookForm}>
          <p className={styles.muted}>
            Enroll in <strong>{batch.name}</strong>. You'll have immediate
            access to all sessions — no studio approval needed.
          </p>
          {!canActForStudent ? (
            <ErrorState description="Select a student before joining this class." />
          ) : null}
          {enroll.isError ? (
            <ErrorState
              description={
                enroll.error instanceof Error
                  ? enroll.error.message
                  : "Could not enroll."
              }
            />
          ) : null}
          <TouchButton
            variant="primary"
            fullWidth
            isDisabled={!canActForStudent}
            isPending={enroll.isPending}
            data-testid="enroll-submit"
            onClick={() => enroll.mutate()}
          >
            Confirm enrollment
          </TouchButton>
        </div>
      </AppBottomSheet>

      <AppBottomSheet
        isOpen={bookOpen}
        onOpenChange={setBookOpen}
        title="Confirm booking"
      >
        <div className={styles.bookForm}>
          <p className={styles.muted}>
            Request a spot in <strong>{batch.name}</strong>
          </p>
          <Select
            label="Booking type"
            selectedKey={type}
            onSelectionChange={(key) =>
              setType(key as "TRIAL" | "OPEN_SEAT" | "PRIVATE")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="TRIAL">Trial class</SelectItem>
              <SelectItem id="OPEN_SEAT">Open seat</SelectItem>
              <SelectItem id="PRIVATE">Private session</SelectItem>
            </SelectContent>
          </Select>
          <FormInput
            label="Notes (optional)"
            value={notes}
            onChange={setNotes}
          />
          {!canActForStudent ? (
            <ErrorState description="Select a student before booking." />
          ) : null}
          {createBooking.isError ? (
            <ErrorState
              description={
                createBooking.error instanceof Error
                  ? createBooking.error.message
                  : "Could not create booking."
              }
            />
          ) : null}
          <TouchButton
            variant="primary"
            fullWidth
            isDisabled={!canActForStudent}
            isPending={createBooking.isPending}
            data-testid="book-submit"
            onClick={() => createBooking.mutate()}
          >
            Submit request
          </TouchButton>
        </div>
      </AppBottomSheet>
    </>
  );
}
