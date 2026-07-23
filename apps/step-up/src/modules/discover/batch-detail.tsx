import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { BatchRatingInput } from "@/modules/discover/batch-rating";
import { useDiscoverBatch } from "@/modules/discover/use-discover";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
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

export function BatchDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studentId, loading: studentLoading } = useActiveStudentContext();
  const query = useDiscoverBatch(id, studentId || undefined);

  const [bookOpen, setBookOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [type, setType] = useState<"TRIAL" | "OPEN_SEAT" | "PRIVATE">("TRIAL");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  const trainerId = query.data?.trainers[0]?.trainer.id;
  const canActForStudent = Boolean(studentId) && !studentLoading;

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
  const price = formatPrice(batch.price);
  const isFull = batch.remainingSeats === 0;
  const seatsLabel =
    batch.remainingSeats == null
      ? null
      : batch.remainingSeats === 0
        ? "Class full"
        : `${batch.remainingSeats} seat${batch.remainingSeats === 1 ? "" : "s"} left`;
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

  if (enrollSuccess) {
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
                onClick={() => setEnrollSuccess(false)}
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
          {price ? <span className={styles.price}>{price}/mo</span> : null}
        </div>

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
          ) : batch.enrollmentMode === "SELF_JOIN" ? (
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!canActForStudent}
              onClick={() => setEnrollOpen(true)}
            >
              Join this class
            </TouchButton>
          ) : (
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!canActForStudent}
              onClick={() => setBookOpen(true)}
            >
              Book this class
            </TouchButton>
          )}
        </StickyCtaBar>
      ) : null}

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
            placeholder="Anything the studio should know"
          />
          {!canActForStudent ? (
            <ErrorState description="Select a student before booking this class." />
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
            onClick={() => createBooking.mutate()}
          >
            Send request & pay
          </TouchButton>
        </div>
      </AppBottomSheet>
    </>
  );
}
