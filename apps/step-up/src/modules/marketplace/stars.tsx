import type { MarketplaceRatingView } from "./types";
import styles from "./stars.module.scss";

export function MarketplaceStars({
  rating,
  label,
}: {
  rating: MarketplaceRatingView;
  label?: string;
}) {
  if (!rating.visible) {
    return (
      <span className={styles.pill} data-testid="marketplace-rating-new">
        {label ? `${label} · ${rating.label}` : rating.label}
      </span>
    );
  }
  return (
    <span
      className={styles.score}
      data-testid="marketplace-rating"
      aria-label={`${label ? `${label} ` : ""}${rating.avg.toFixed(1)} from ${rating.count} ratings`}
    >
      <span className={styles.mark} aria-hidden>
        ★
      </span>
      <strong>{rating.avg.toFixed(1)}</strong>
      <span className={styles.count}>{rating.count}</span>
    </span>
  );
}
