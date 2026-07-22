import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { Icon } from "@dev-ui/icons";
import { useNavigate } from "@tanstack/react-router";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useDiscoverBatch } from "@/modules/discover/use-discover";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./batch-detail.module.scss";

type BookingSummary = {
  type: string;
  status: string;
  notes?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

type BatchDetailPreviewProps = {
  batchId: string;
  studentId?: string | null;
  booking?: BookingSummary | null;
  onOpenFull?: () => void;
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

export function BatchDetailPreview({
  batchId,
  studentId,
  booking,
  onOpenFull,
}: BatchDetailPreviewProps) {
  const navigate = useNavigate();
  const query = useDiscoverBatch(batchId, studentId || undefined);

  if (query.isLoading) {
    return (
      <div className={styles.preview}>
        <SkeletonBlock height="10rem" radius="var(--radius-2xl)" />
        <SkeletonBlock height="1.25rem" width="70%" />
        <SkeletonBlock height="1rem" width="45%" />
        <SkeletonBlock height="4rem" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        description={
          query.error instanceof Error
            ? query.error.message
            : "Could not load class details."
        }
      />
    );
  }

  const batch = query.data;
  const trainer = batch.trainers[0]?.trainer;
  const price = formatPrice(batch.priceMonthly ?? batch.plan?.priceMonthly);
  const isFull = batch.remainingSeats === 0;
  const seatsLabel =
    batch.remainingSeats == null
      ? null
      : batch.remainingSeats === 0
        ? "Class full"
        : `${batch.remainingSeats} seat${batch.remainingSeats === 1 ? "" : "s"} left`;

  return (
    <div className={styles.preview}>
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

      <div>
        <h2 className={styles.sectionTitle}>{batch.name}</h2>
        {batch.scheduleLabel ? (
          <p className={styles.muted}>{batch.scheduleLabel}</p>
        ) : null}
      </div>

      {booking ? (
        <div className={styles.requestStatus} data-status={booking.status}>
          <div>
            <p className={styles.requestEyebrow}>Your request</p>
            <p className={styles.requestTitle}>
              {booking.status.replaceAll("_", " ")}
            </p>
            <p className={styles.muted}>
              {booking.type.replaceAll("_", " ")}
              {booking.notes ? ` · ${booking.notes}` : ""}
            </p>
            {booking.startsAt && booking.endsAt ? (
              <p className={styles.muted}>
                {new Date(booking.startsAt).toLocaleString()} –{" "}
                {new Date(booking.endsAt).toLocaleTimeString()}
              </p>
            ) : null}
          </div>
          <Badge
            appearance="subtle"
            variant={
              booking.status === "CONFIRMED"
                ? "success"
                : booking.status === "PENDING"
                  ? "warning"
                  : booking.status === "CANCELLED"
                    ? "danger"
                    : "info"
            }
          >
            {booking.status}
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
          <span className={styles.stat} data-full={isFull ? "true" : undefined}>
            {seatsLabel}
          </span>
        ) : null}
        {price ? <span className={styles.price}>{price}/mo</span> : null}
      </div>

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
          <h3 className={styles.sectionTitle}>Location</h3>
          <p>{batch.branch.name}</p>
          {batch.branch.address ? (
            <p className={styles.muted}>{batch.branch.address}</p>
          ) : null}
        </div>
      ) : null}

      {batch.sessions && batch.sessions.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Upcoming sessions</h3>
          <ul className={styles.sessionList}>
            {batch.sessions.slice(0, 3).map((session) => (
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

      <TouchButton
        variant="primary"
        fullWidth
        onClick={() => {
          onOpenFull?.();
          void navigate({
            to: "/me/batches/$id",
            params: { id: batchId },
          });
        }}
      >
        Open full class page
      </TouchButton>
    </div>
  );
}

export function BookingWithoutBatchPreview({
  type,
  notes,
}: {
  type: string;
  notes?: string | null | undefined;
}) {
  return (
    <EmptyState
      title={type.replaceAll("_", " ")}
      description={
        notes
          ? notes
          : "This request is not tied to a class. The studio will confirm details separately."
      }
    />
  );
}
