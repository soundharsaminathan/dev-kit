import { Badge } from "@dev-ui/components/badge";
import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import styles from "./batch-card.module.scss";
import { ElasticAvatarStack } from "./elastic-avatar-stack";

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
  priceMonthly?: number | string | null;
  durationMinutes?: number | null;
  scheduleLabel?: string | null;
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

export function BatchCard({
  batch,
  ctaLabel,
  detailTo = "/me/batches/$id",
}: BatchCardProps) {
  const price = formatPrice(batch.priceMonthly);
  const trainers = batch.trainers ?? [];

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
        <div className={styles.top}>
          <div className={styles.titleBlock}>
            <h3 className={styles.name}>{batch.name}</h3>
            {batch.ratingAvg != null && batch.ratingAvg > 0 ? (
              <span className={styles.rating}>
                <Icon name="star" className={styles.star} />
                {batch.ratingAvg.toFixed(1)}
              </span>
            ) : null}
          </div>
          {trainers.length > 0 ? (
            <ElasticAvatarStack
              className={styles.trainers}
              items={trainers.map((trainer) => ({
                id: trainer.id,
                name: trainer.name,
                image: trainer.photoUrl,
              }))}
              itemSize={28}
              overlap={10}
              pushForce={8}
              maxItems={5}
            />
          ) : null}
        </div>
        <div className={styles.footer}>
          <div className={styles.stats}>
            {batch.durationMinutes ? (
              <span>{batch.durationMinutes} min</span>
            ) : null}
            {batch.remainingSeats != null ? (
              <span data-full={batch.remainingSeats === 0 ? "true" : undefined}>
                {batch.remainingSeats === 0
                  ? "Full"
                  : `${batch.remainingSeats} seat${batch.remainingSeats === 1 ? "" : "s"} left`}
              </span>
            ) : null}
            {price ? <span className={styles.price}>{price}/mo</span> : null}
          </div>
          <div className={styles.footerEnd}>
            {batch.scheduleLabel ? (
              <span className={styles.schedule}>{batch.scheduleLabel}</span>
            ) : null}
            {ctaLabel ? <span className={styles.cta}>{ctaLabel}</span> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
