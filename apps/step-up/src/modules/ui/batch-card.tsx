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

function seatsLabel(remaining: number | null | undefined) {
  if (remaining == null) return null;
  if (remaining === 0) return "Full";
  if (remaining === 1) return "Only 1 seat left";
  if (remaining <= 3) return `Only ${remaining} seats left`;
  return `${remaining} seats left`;
}

export function BatchCard({
  batch,
  ctaLabel,
  detailTo = "/me/batches/$id",
}: BatchCardProps) {
  const price = formatPrice(batch.price);
  const trainers = batch.trainers ?? [];
  const category = categoryLabel(batch.category);
  const seats = seatsLabel(batch.remainingSeats);
  const seatsUrgent = batch.remainingSeats != null && batch.remainingSeats <= 3;
  const trainerNames = trainers.map((trainer) => trainer.name).join(", ");
  const metaParts = [
    category,
    batch.styleBadge && batch.styleBadge !== category ? batch.styleBadge : null,
  ].filter(Boolean);

  return (
    <Link
      to={detailTo as "/app/batches/$id"}
      params={{ id: batch.id }}
      className={styles.card}
    >
      <div className={styles.thumb}>
        {batch.coverImageUrl ? (
          <img
            src={batch.coverImageUrl}
            alt=""
            className={styles.thumbImg}
            loading="lazy"
          />
        ) : (
          <div className={styles.thumbFallback} aria-hidden>
            <Icon name={ENTITY_ICONS.batch} className={styles.thumbIcon} />
          </div>
        )}
        {batch.styleBadge ? (
          <Badge className={styles.badge}>{batch.styleBadge}</Badge>
        ) : null}
      </div>
      <div className={styles.body}>
        {metaParts.length > 0 ? (
          <p className={styles.meta}>{metaParts.join(" · ")}</p>
        ) : null}

        <h3 className={styles.name}>{batch.name}</h3>

        {batch.ratingAvg != null && batch.ratingAvg > 0 ? (
          <div className={styles.rating}>
            <span className={styles.ratingValue}>
              {batch.ratingAvg.toFixed(1)}
            </span>
            <Icon name="star" className={styles.star} />
            {batch.ratingCount != null && batch.ratingCount > 0 ? (
              <span className={styles.ratingCount}>({batch.ratingCount})</span>
            ) : null}
          </div>
        ) : null}

        {batch.scheduleLabel ? (
          <p className={styles.schedule}>{batch.scheduleLabel}</p>
        ) : null}

        <div className={styles.details}>
          {batch.durationMinutes ? (
            <span>{batch.durationMinutes} min</span>
          ) : null}
          {batch.branchName ? <span>{batch.branchName}</span> : null}
        </div>

        {trainerNames ? (
          <p className={styles.trainers}>{trainerNames}</p>
        ) : null}

        {price ? (
          <p className={styles.price}>
            {price}
            <span className={styles.priceUnit}>/mo</span>
          </p>
        ) : null}

        {seats ? (
          <p
            className={styles.seats}
            data-urgent={seatsUrgent ? "true" : undefined}
          >
            {seats}
            {batch.capacity != null && batch.remainingSeats != null
              ? ` · ${batch.capacity} capacity`
              : null}
          </p>
        ) : null}

        {ctaLabel ? <span className={styles.cta}>{ctaLabel}</span> : null}
      </div>
    </Link>
  );
}
