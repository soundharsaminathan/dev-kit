import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useStudioId } from "@/lib/use-studio-id";
import { BatchChatButton } from "@/modules/chat/batch-chat-button";
import { BatchRatingInput } from "@/modules/discover/batch-rating";
import type { DiscoverBatchPlan } from "@/modules/discover/types";
import { useDiscoverBatch } from "@/modules/discover/use-discover";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { ErrorState, SuccessState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import styles from "./batch-detail.module.scss";

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
  return plan.individualAudience === "ADULT" ? "Adult" : "Kid";
}

function planKindLabel(plan: DiscoverBatchPlan) {
  return `Individual · ${planAudienceLabel(plan)}`;
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

type BatchJoinOptionsProps = {
  showChoosePlan: boolean;
  showTrial: boolean;
  showBookClass: boolean;
  isFull: boolean;
  canActForStudent: boolean;
  onChoosePlan: () => void;
  onTrial: () => void;
  onBookClass: () => void;
};

function BatchJoinOptions({
  showChoosePlan,
  showTrial,
  showBookClass,
  isFull,
  canActForStudent,
  onChoosePlan,
  onTrial,
  onBookClass,
}: BatchJoinOptionsProps) {
  return (
    <div className={styles.joinOptions}>
      {showChoosePlan ? (
        <TouchButton
          variant="primary"
          fullWidth
          isDisabled={!canActForStudent || isFull}
          data-testid="choose-plan-cta"
          onClick={onChoosePlan}
        >
          {isFull ? "Class is full" : "Choose a plan"}
        </TouchButton>
      ) : null}
      {!showChoosePlan && isFull ? (
        <TouchButton variant="primary" fullWidth isDisabled>
          Class is full
        </TouchButton>
      ) : null}
      {showTrial ? (
        <TouchButton
          variant={showChoosePlan || showBookClass ? "quiet" : "primary"}
          fullWidth
          isDisabled={!canActForStudent}
          data-testid="trial-booking-cta"
          onClick={onTrial}
        >
          Request trial
        </TouchButton>
      ) : null}
      {showBookClass ? (
        <TouchButton
          variant={showChoosePlan || showTrial ? "quiet" : "primary"}
          fullWidth
          isDisabled={!canActForStudent || isFull}
          data-testid="book-class-cta"
          onClick={onBookClass}
        >
          Book this class
        </TouchButton>
      ) : null}
    </div>
  );
}

export function BatchDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const {
    studentId,
    loading: studentLoading,
    children,
  } = useActiveStudentContext();
  const query = useDiscoverBatch(id, studentId || undefined);

  const [bookOpen, setBookOpen] = useState(false);
  const [tryItOpen, setTryItOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DiscoverBatchPlan | null>(
    null,
  );
  const [selectedAdultIds, setSelectedAdultIds] = useState<string[]>([]);
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>([]);
  const [type, setType] = useState<"TRIAL" | "OPEN_SEAT" | "PRIVATE">("TRIAL");
  const [notes, setNotes] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [success, setSuccess] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const trainerId = query.data?.trainers[0]?.trainer.id;
  const canActForStudent = Boolean(studentId) && !studentLoading;

  const createBooking = useMutation({
    mutationFn: () => {
      if (!studentId) {
        throw new Error("Select a student before booking.");
      }
      if (type === "TRIAL" && !selectedSessionId) {
        throw new Error("Pick a session for your trial.");
      }
      return api.post<{
        id: string;
        status: string;
      }>("/bookings", {
        studioId,
        studentId,
        type,
        batchId: type === "TRIAL" ? undefined : id,
        notes: notes || undefined,
        trainerId: type === "PRIVATE" ? trainerId : undefined,
        sessionId: selectedSessionId || undefined,
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
      setSelectedSessionId(null);
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

  const purchase = useMutation({
    mutationFn: () => {
      if (!user || !selectedPlan) {
        throw new Error("Select a plan to continue.");
      }
      const coveredStudents = [
        ...selectedAdultIds.map((studentSeatId) => ({
          studentId: studentSeatId,
          seatRole: "ADULT" as const,
        })),
        ...selectedKidIds.map((studentSeatId) => ({
          studentId: studentSeatId,
          seatRole: "KID" as const,
        })),
      ];
      return api.post<{
        id: string;
        status: string;
      }>(`/batches/${id}/purchase`, {
        subscriptionId: selectedPlan.id,
        purchaserUserId: user.id,
        coveredStudents,
      });
    },
    onSuccess: (invoice) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batches", id] }),
        queryClient.invalidateQueries({
          queryKey: ["batches", "discover", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["memberships", studentId],
        }),
      ]);
      setPurchaseOpen(false);
      setSelectedPlan(null);
      if (invoice.status === "PENDING") {
        void navigate({
          to: "/me/checkout/invoice/$invoiceId",
          params: { invoiceId: invoice.id },
        });
        return;
      }
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
          queryKey: ["batches", "discover", studioId],
        }),
      ]);
    },
  });

  function openPurchase(plan: DiscoverBatchPlan) {
    if (plan.kind !== "INDIVIDUAL") return;
    setSelectedPlan(plan);
    if (plan.individualAudience === "ADULT") {
      setSelectedAdultIds([studentId]);
      setSelectedKidIds([]);
    } else {
      setSelectedAdultIds([]);
      const defaultKid = children[0]?.id ?? studentId;
      setSelectedKidIds(defaultKid ? [defaultKid] : []);
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
  const plans = (batch.plans ?? []).filter(
    (plan) => plan.active && plan.kind === "INDIVIDUAL",
  );
  const individualPlans = plans.slice().sort(sortPlans);
  const hasPlans = individualPlans.length > 0;
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
  const showTrialConvertCta = false;
  const showChoosePlan = showBookingCta && hasPlans;
  const showBookClass =
    showBookingCta &&
    ((!hasPlans && !isFull) ||
      (hasPlans && batch.enrollmentMode === "STAFF_ONLY"));
  const showTrial = showBookingCta && (hasPlans || isFull);
  const showFullNotice = showBookingCta && !showChoosePlan && isFull;
  const joinOptionCount =
    Number(showChoosePlan) +
    Number(showFullNotice) +
    Number(showTrial) +
    Number(showBookClass);
  const hasMultipleJoinOptions = joinOptionCount > 1;
  const useTryItSheet = isMobile && hasMultipleJoinOptions;
  const showBatchChat =
    Boolean(batch.viewerEnrolled) &&
    Boolean(user?.id) &&
    user?.id === studentId;

  const seatsValid =
    selectedPlan != null &&
    selectedAdultIds.length === selectedPlan.adultSeats &&
    selectedKidIds.length === selectedPlan.kidSeats;

  if (purchaseSuccess) {
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
        titleEnd={
          showBatchChat ? (
            <BatchChatButton
              batchId={batch.id}
              messagesTo="/me/messages/$id"
            />
          ) : null
        }
        paddedCta={
          showBookingCta ||
          showTrialConvertCta ||
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
                  ? ". Your seat is held for 10 minutes — finish payment before the timer ends."
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
                    data-testid="plan-card"
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
              isError={rateBatch.isError}
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
      ) : showTrialConvertCta ? (
        <StickyCtaBar>
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
        </StickyCtaBar>
      ) : showBookingCta ? (
        <StickyCtaBar>
          {useTryItSheet ? (
            <TouchButton
              variant="primary"
              fullWidth
              data-testid="try-it-cta"
              onClick={() => setTryItOpen(true)}
            >
              Try It
            </TouchButton>
          ) : (
            <BatchJoinOptions
              showChoosePlan={showChoosePlan}
              showTrial={showTrial}
              showBookClass={showBookClass}
              isFull={isFull}
              canActForStudent={canActForStudent}
              onChoosePlan={() => {
                const first = plans[0];
                if (first) openPurchase(first);
              }}
              onTrial={() => {
                setType("TRIAL");
                setBookOpen(true);
              }}
              onBookClass={() => {
                setType("OPEN_SEAT");
                setBookOpen(true);
              }}
            />
          )}
        </StickyCtaBar>
      ) : null}

      {useTryItSheet ? (
        <AppSheet
          isOpen={tryItOpen}
          onOpenChange={setTryItOpen}
          title="Try It"
        >
          <BatchJoinOptions
            showChoosePlan={showChoosePlan}
            showTrial={showTrial}
            showBookClass={showBookClass}
            isFull={isFull}
            canActForStudent={canActForStudent}
            onChoosePlan={() => {
              setTryItOpen(false);
              const first = plans[0];
              if (first) openPurchase(first);
            }}
            onTrial={() => {
              setTryItOpen(false);
              setType("TRIAL");
              setBookOpen(true);
            }}
            onBookClass={() => {
              setTryItOpen(false);
              setType("OPEN_SEAT");
              setBookOpen(true);
            }}
          />
        </AppSheet>
      ) : null}

      <AppSheet
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
              <p className={styles.muted}>
                Enrolls the selected student into <strong>{batch.name}</strong>{" "}
                for this plan period.
              </p>
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
                data-testid="purchase-submit"
                onClick={() => purchase.mutate()}
              >
                Enroll with this plan
              </TouchButton>
            </>
          ) : null}
        </div>
      </AppSheet>

      <AppSheet
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
            onSelectionChange={(key) => {
              const nextType = key as "TRIAL" | "OPEN_SEAT" | "PRIVATE";
              setType(nextType);
              if (nextType !== "TRIAL") setSelectedSessionId(null);
            }}
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
          {type === "TRIAL" ? (
            <Select
              label="Session"
              selectedKey={selectedSessionId ?? null}
              onSelectionChange={(key) =>
                setSelectedSessionId(key ? (key as string) : null)
              }
            >
              <SelectTrigger data-testid="trial-session-select">
                <SelectValue placeholder="Pick a session" />
              </SelectTrigger>
              <SelectContent>
                {(batch.sessions ?? []).slice(0, 8).map((session) => (
                  <SelectItem key={session.id} id={session.id}>
                    {new Date(session.startsAt).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
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
            isDisabled={
              !canActForStudent || (type === "TRIAL" && !selectedSessionId)
            }
            isPending={createBooking.isPending}
            data-testid="book-submit"
            onClick={() => createBooking.mutate()}
          >
            Submit request
          </TouchButton>
        </div>
      </AppSheet>
    </>
  );
}
