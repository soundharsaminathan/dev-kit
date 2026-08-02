import { Badge } from "@dev-ui/components/badge";
import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import styles from "./batch-card.module.scss";

export type BatchCardTrainer = {
  id: string;
  name: string;
  photoUrl?: string | null;
};

export type BatchCardData = {
  id: string;
  name: string;
  coverImageUrl?: string | null;
  styleBadge?: string | null;
  category?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  remainingSeats?: number | null;
  capacity?: number | null;
  price?: number | string | null;
  durationMinutes?: number | null;
  scheduleLabel?: string | null;
  branchName?: string | null;
  active?: boolean | null;
  enrollmentMode?: "STAFF_ONLY" | "SELF_JOIN" | null;
  trainers?: BatchCardTrainer[];
};

type BatchCardProps = {
  batch: BatchCardData;
  ctaLabel?: string;
  /** Route path template; defaults to member detail. */
  detailTo?: "/me/batches/$id" | "/app/batches/$id";
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

function categoryLabel(category: string | null | undefined) {
  if (!category) return null;
  if (category === "KIDS") return "Kids";
  if (category === "ADULTS") return "Adults";
  return category;
}

function seatsProof(
  remaining: number | null | undefined,
  capacity?: number | null,
) {
  if (remaining == null) return null;
  if (remaining === 0) return "Batch full";
  if (remaining === 1) return "Only 1 seat left";
  if (remaining <= 3) return `Only ${remaining} seats left`;
  if (capacity != null) {
    const enrolled = Math.max(0, capacity - remaining);
    if (enrolled > 0) return `${enrolled} enrolled · ${remaining} seats left`;
  }
  return `${remaining} seats left`;
}

const STAR_KEYS = ["s1", "s2", "s3", "s4", "s5"] as const;

function StarRow({ value }: { value: number }) {
  const filled = Math.round(Math.min(5, Math.max(0, value)));
  return (
    <span className={styles.stars} aria-hidden>
      {STAR_KEYS.map((key, index) => (
        <Icon
          key={key}
          name="star"
          className={styles.star}
          data-filled={index < filled ? "true" : undefined}
        />
      ))}
    </span>
  );
}

export function BatchCard({
  batch,
  ctaLabel,
  detailTo = "/me/batches/$id",
}: BatchCardProps) {
  const price = formatPrice(batch.price);
  const trainers = batch.trainers ?? [];
  const category = categoryLabel(batch.category);
  const seats = seatsProof(batch.remainingSeats, batch.capacity);
  const seatsUrgent = batch.remainingSeats != null && batch.remainingSeats <= 3;
  const primaryTrainer = trainers[0]?.name ?? null;
  const isInactive = batch.active === false;
  const ribbon = batch.styleBadge ?? (isInactive ? "Inactive" : null);

  return (
    <Link
      to={detailTo as "/app/batches/$id"}
      params={{ id: batch.id }}
      className={styles.card}
      data-inactive={isInactive ? "true" : undefined}
    >
      <div className={styles.media}>
        {batch.coverImageUrl ? (
          <img
            src={batch.coverImageUrl}
            alt=""
            className={styles.mediaImg}
            loading="lazy"
          />
        ) : (
          <div className={styles.mediaFallback} aria-hidden>
            <Icon name={ENTITY_ICONS.batch} className={styles.mediaIcon} />
          </div>
        )}
        {ribbon ? (
          <Badge
            className={styles.ribbon}
            data-inactive={isInactive && !batch.styleBadge ? "true" : undefined}
          >
            {ribbon}
          </Badge>
        ) : null}
      </div>

      <div className={styles.body}>
        {category ? <p className={styles.brand}>{category}</p> : null}

        <h3 className={styles.name}>{batch.name}</h3>

        {batch.ratingAvg != null && batch.ratingAvg > 0 ? (
          <div className={styles.rating}>
            <StarRow value={batch.ratingAvg} />
            <span className={styles.ratingValue}>
              {batch.ratingAvg.toFixed(1)}
            </span>
            {batch.ratingCount != null && batch.ratingCount > 0 ? (
              <span className={styles.ratingCount}>({batch.ratingCount})</span>
            ) : null}
          </div>
        ) : null}

        {seats ? (
          <p
            className={styles.proof}
            data-urgent={seatsUrgent ? "true" : undefined}
          >
            {seats}
          </p>
        ) : null}

        {price ? (
          <p className={styles.price}>
            {price}
            <span className={styles.priceUnit}>/mo</span>
          </p>
        ) : null}

        {batch.scheduleLabel ? (
          <p className={styles.schedule}>
            <span className={styles.scheduleLabel}>Schedule</span>{" "}
            <strong>{batch.scheduleLabel}</strong>
          </p>
        ) : null}

        {(batch.durationMinutes || batch.branchName) && (
          <p className={styles.meta}>
            {[
              batch.durationMinutes ? `${batch.durationMinutes} min` : null,
              batch.branchName,
              batch.enrollmentMode === "SELF_JOIN" ? "Self-join" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        {trainers.length > 0 ? (
          <div className={styles.trainers}>
            <p className={styles.trainersLabel}>
              Trainer{trainers.length > 1 ? "s" : ""}:{" "}
              <strong>{primaryTrainer}</strong>
              {trainers.length > 1 ? ` +${trainers.length - 1}` : null}
            </p>
            <div className={styles.swatches} aria-hidden>
              {trainers.slice(0, 4).map((trainer) =>
                trainer.photoUrl ? (
                  <img
                    key={trainer.id}
                    src={trainer.photoUrl}
                    alt=""
                    className={styles.swatch}
                    loading="lazy"
                  />
                ) : (
                  <span key={trainer.id} className={styles.swatchFallback}>
                    {trainer.name.slice(0, 1).toUpperCase()}
                  </span>
                ),
              )}
            </div>
          </div>
        ) : null}

        {ctaLabel ? (
          <span
            className={styles.cta}
            data-tone={
              ctaLabel === "Enrolled" || ctaLabel === "Full"
                ? "muted"
                : undefined
            }
          >
            {ctaLabel}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
