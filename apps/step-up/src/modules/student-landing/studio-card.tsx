import { Link } from "@tanstack/react-router";
import { STUDENT_NEARBY } from "./content";
import { formatDistance, formatPriceFrom, formatRating } from "./format";
import styles from "./studio-card.module.scss";
import type { DiscoverStudioCard } from "./types";

type StudioCardProps = {
  studio: DiscoverStudioCard;
  className?: string;
};

export function StudioCard({ studio, className }: StudioCardProps) {
  const rating = formatRating(studio.ratingAvg, studio.ratingCount);
  const distance = formatDistance(studio.distanceKm);
  const price = formatPriceFrom(studio.priceFrom, studio.priceCadence);
  const stylesLabel = studio.styles.slice(0, 3).join(" · ");

  return (
    <article className={[styles.card, className].filter(Boolean).join(" ")}>
      <Link
        to="/studio/$studioId"
        params={{ studioId: studio.slug || studio.id }}
        className={styles.mediaLink}
        aria-label={`${studio.name} studio`}
      >
        {studio.imageUrl ? (
          <img
            className={styles.image}
            src={studio.imageUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholder} aria-hidden>
            <span>{studio.name.slice(0, 1)}</span>
          </div>
        )}
      </Link>
      <div className={styles.body}>
        <div className={styles.top}>
          <h3 className={styles.name}>
            <Link
              to="/studio/$studioId"
              params={{ studioId: studio.slug || studio.id }}
            >
              {studio.name}
            </Link>
          </h3>
          {studio.locality || studio.city ? (
            <p className={styles.city}>
              {[studio.locality, studio.city].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {stylesLabel ? <p className={styles.styles}>{stylesLabel}</p> : null}
        <div className={styles.meta}>
          {rating ? (
            <span className={styles.rating} title={`Rated ${rating}`}>
              ★ {rating}
            </span>
          ) : null}
          {distance ? <span>{distance}</span> : null}
          {studio.timingLabel ? <span>{studio.timingLabel}</span> : null}
          {price ? <span className={styles.price}>{price}</span> : null}
        </div>
        <Link
          to="/studio/$studioId"
          params={{ studioId: studio.slug || studio.id }}
          className={styles.cta}
        >
          {STUDENT_NEARBY.viewStudio}
        </Link>
      </div>
    </article>
  );
}

export function StudioCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden>
      <div className={styles.skeletonMedia} />
      <div className={styles.body}>
        <div className={styles.skeletonLine} data-w="70" />
        <div className={styles.skeletonLine} data-w="45" />
        <div className={styles.skeletonLine} data-w="90" />
      </div>
    </div>
  );
}
