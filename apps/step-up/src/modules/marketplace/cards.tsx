import { Link } from "@tanstack/react-router";
import { formatPriceFrom } from "@/modules/student-landing/format";
import type {
  MarketplaceClassCard,
  MarketplaceRatingView,
  MarketplaceStudioCard,
  MarketplaceTrainerCard,
} from "./types";
import styles from "./cards.module.scss";

function ratingLabel(rating: MarketplaceRatingView): string {
  if (rating.visible) return `★ ${rating.avg.toFixed(1)}`;
  return rating.label;
}

function audienceLabel(value: "KIDS" | "ADULTS" | "BOTH" | null): string | null {
  if (value === "KIDS") return "Kids";
  if (value === "ADULTS") return "Adults";
  return null;
}

function levelLabel(value: string | null): string | null {
  if (value === "BEGINNER") return "Beginner";
  if (value === "INTERMEDIATE") return "Intermediate";
  if (value === "ADVANCED") return "Advanced";
  return null;
}

export function MarketplaceClassCardView({
  item,
  onBook,
  bookVisible = true,
}: {
  item: MarketplaceClassCard;
  onBook: (item: MarketplaceClassCard) => void;
  bookVisible?: boolean;
}) {
  const price = formatPriceFrom(item.priceFrom, item.priceCadence);
  const audience = audienceLabel(item.audience);
  const level = levelLabel(item.level);

  return (
    <article className={styles.card}>
      <Link
        to="/classes/$slug"
        params={{ slug: item.slug }}
        className={styles.cardLink}
      >
        <div className={styles.media}>
          {item.coverImageUrl ? (
            <img className={styles.image} src={item.coverImageUrl} alt="" />
          ) : (
            <div className={styles.placeholder} aria-hidden>
              {item.name.slice(0, 1)}
            </div>
          )}
          <div className={styles.badges}>
            {level ? <span className={styles.badge}>{level}</span> : null}
            {audience ? <span className={styles.badge}>{audience}</span> : null}
          </div>
        </div>
        <div className={styles.body}>
          <h3 className={styles.name}>{item.name}</h3>
          <p className={styles.sub}>
            {[item.studioName, item.locality].filter(Boolean).join(" · ")}
          </p>
          {item.scheduleLabel ? (
            <p className={styles.meta}>{item.scheduleLabel}</p>
          ) : null}
          {item.trainerName ? (
            <p className={styles.meta}>{item.trainerName}</p>
          ) : null}
          <div className={styles.row}>
            <span className={styles.stars}>{ratingLabel(item.studioRating)}</span>
            {price ? <span className={styles.price}>From {price}</span> : null}
            {item.seatLabel ? (
              <span className={styles.seat}>{item.seatLabel}</span>
            ) : null}
            {item.seatLabel === "Full" && item.canTrial ? (
              <span className={styles.trialOpen}>Trial open</span>
            ) : null}
          </div>
        </div>
      </Link>
      {bookVisible ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.book}
            disabled={!item.canTrial}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBook(item);
            }}
          >
            Book
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function MarketplaceStudioCardView({
  item,
  onBook,
}: {
  item: MarketplaceStudioCard;
  onBook: (item: MarketplaceStudioCard) => void;
}) {
  const price = formatPriceFrom(item.priceFrom, item.priceCadence);
  const audience = audienceLabel(item.audience);
  const canBook = item.canTrial || item.canPrivate || item.canFloorHire;

  return (
    <article className={styles.card}>
      <Link
        to="/studios/$slug"
        params={{ slug: item.slug }}
        className={styles.cardLink}
      >
        <div className={`${styles.media} ${styles.studioMedia}`}>
          {item.coverImageUrl ? (
            <img className={styles.image} src={item.coverImageUrl} alt="" />
          ) : (
            <div className={styles.placeholder} aria-hidden>
              {item.name.slice(0, 1)}
            </div>
          )}
          {audience ? (
            <div className={styles.badges}>
              <span className={styles.badge}>{audience}</span>
            </div>
          ) : null}
        </div>
        <div className={styles.body}>
          <h3 className={styles.name}>{item.name}</h3>
          <p className={styles.sub}>
            {[item.locality, item.city].filter(Boolean).join(" · ")}
          </p>
          {item.styles.length > 0 ? (
            <p className={styles.meta}>{item.styles.slice(0, 3).join(" · ")}</p>
          ) : null}
          <div className={styles.row}>
            <span className={styles.stars}>{ratingLabel(item.rating)}</span>
            {price ? <span className={styles.price}>From {price}</span> : null}
          </div>
        </div>
      </Link>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.book}
          disabled={!canBook}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onBook(item);
          }}
        >
          Book
        </button>
      </div>
    </article>
  );
}

export function MarketplaceTrainerCardView({
  item,
  onBook,
}: {
  item: MarketplaceTrainerCard;
  onBook: (item: MarketplaceTrainerCard) => void;
}) {
  const teaches = item.studioNames.slice(0, 2).join(" · ");
  const canBook = item.canTrial || item.canPrivate;

  return (
    <article className={styles.card}>
      <Link
        to="/trainers/$slug"
        params={{ slug: item.slug ?? item.id }}
        className={styles.cardLink}
      >
        <div className={`${styles.media} ${styles.trainerMedia}`}>
          {item.photoUrl ? (
            <img className={styles.image} src={item.photoUrl} alt="" />
          ) : (
            <div className={styles.placeholder} aria-hidden>
              {item.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className={styles.body}>
          <h3 className={styles.name}>{item.name}</h3>
          {teaches ? <p className={styles.sub}>Teaches at {teaches}</p> : null}
          {item.locality ? <p className={styles.meta}>{item.locality}</p> : null}
          <div className={styles.row}>
            <span className={styles.stars}>{ratingLabel(item.rating)}</span>
          </div>
        </div>
      </Link>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.book}
          disabled={!canBook}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onBook(item);
          }}
        >
          Book
        </button>
      </div>
    </article>
  );
}

export function MarketplaceCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.grid} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={`sk-${index}`} className={`${styles.card} ${styles.skeleton}`}>
          <div className={styles.skeletonMedia} />
          <div className={styles.body}>
            <div className={styles.skeletonLine} style={{ width: "72%" }} />
            <div className={styles.skeletonLine} style={{ width: "48%" }} />
            <div className={styles.skeletonLine} style={{ width: "60%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
