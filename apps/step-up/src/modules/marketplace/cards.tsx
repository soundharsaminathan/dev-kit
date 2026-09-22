import { Link } from "@tanstack/react-router";
import { Clock, Heart, MapPin } from "lucide-react";
import { formatPriceFrom } from "@/modules/student-landing/format";
import { MarketplaceStars } from "./stars";
import type {
  MarketplaceClassCard,
  MarketplaceStudioCard,
  MarketplaceTrainerCard,
} from "./types";
import { marketplacePersonalBadges } from "./viewer";
import styles from "./cards.module.scss";

function audienceLabel(value: "KIDS" | "ADULTS" | "BOTH" | null): string | null {
  if (value === "KIDS") return "Kids";
  if (value === "ADULTS") return "Adults";
  return null;
}

function formatClassPrice(
  price: number | null,
  cadence: "MONTHLY" | "QUARTERLY" | null,
): string | null {
  if (price == null) return null;
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
  if (cadence === "QUARTERLY") return `From ${formatted} / quarter`;
  return `From ${formatted} / month`;
}

function formatLocalityLine(
  locality: string | null,
  distanceKm: number | null,
): string | null {
  const parts: string[] = [];
  if (locality) parts.push(locality);
  if (distanceKm != null) {
    const rounded =
      distanceKm < 10
        ? Math.round(distanceKm * 10) / 10
        : Math.round(distanceKm);
    parts.push(`${rounded} km`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
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
  const price = formatClassPrice(item.priceFrom, item.priceCadence);
  const localityLine = formatLocalityLine(item.locality, item.distanceKm);
  const personal = marketplacePersonalBadges(item);
  const seatUrgency =
    item.seatLabel && item.seatLabel !== "Full"
      ? item.seatLabel
      : item.availableSeats > 0 && item.availableSeats <= 8
        ? `${item.availableSeats} seats left`
        : item.seatLabel === "Full"
          ? "Full"
          : null;

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <Link
          to="/classes/$slug"
          params={{ slug: item.slug }}
          className={styles.mediaLink}
          tabIndex={-1}
          aria-hidden
        >
          {item.coverImageUrl ? (
            <img className={styles.image} src={item.coverImageUrl} alt="" />
          ) : (
            <div className={styles.placeholder} aria-hidden>
              {item.name.slice(0, 1)}
            </div>
          )}
        </Link>
        <div className={styles.badges}>
          {personal.map((badge) => (
            <span
              key={badge.id}
              className={styles.personal}
              data-kind={badge.id}
            >
              {badge.label}
            </span>
          ))}
          {item.canTrial ? (
            <span className={styles.trialBadge}>Trial available</span>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.wish}
          aria-label={`Save ${item.name}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <Heart aria-hidden className={styles.wishIcon} strokeWidth={2} />
        </button>
      </div>
      <div className={styles.body}>
        <Link
          to="/classes/$slug"
          params={{ slug: item.slug }}
          className={styles.copyLink}
        >
          <h3 className={styles.name}>{item.name}</h3>
          <p className={styles.sub}>{item.studioName}</p>
          {localityLine ? (
            <p className={styles.metaLine}>
              <MapPin aria-hidden className={styles.metaIcon} />
              <span>{localityLine}</span>
            </p>
          ) : null}
          <div className={styles.ratingRow}>
            <MarketplaceStars rating={item.studioRating} />
          </div>
          {item.scheduleLabel ? (
            <p className={styles.metaLine}>
              <Clock aria-hidden className={styles.metaIcon} />
              <span>{item.scheduleLabel}</span>
            </p>
          ) : null}
        </Link>
        <div className={styles.footer}>
          <div className={styles.footerMeta}>
            {price ? <span className={styles.price}>{price}</span> : null}
            {seatUrgency ? (
              <span
                className={styles.seat}
                data-full={seatUrgency === "Full" ? "true" : undefined}
              >
                {seatUrgency}
              </span>
            ) : null}
          </div>
          {bookVisible ? (
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
          ) : null}
        </div>
      </div>
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
  const localityLine = formatLocalityLine(item.locality, item.distanceKm);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <Link
          to="/studios/$slug"
          params={{ slug: item.slug }}
          className={styles.mediaLink}
          tabIndex={-1}
          aria-hidden
        >
          {item.coverImageUrl ? (
            <img className={styles.image} src={item.coverImageUrl} alt="" />
          ) : (
            <div className={styles.placeholder} aria-hidden>
              {item.name.slice(0, 1)}
            </div>
          )}
        </Link>
        {audience ? (
          <div className={styles.badges}>
            <span className={styles.trialBadge}>{audience}</span>
          </div>
        ) : null}
      </div>
      <div className={styles.body}>
        <Link
          to="/studios/$slug"
          params={{ slug: item.slug }}
          className={styles.copyLink}
        >
          <h3 className={styles.name}>{item.name}</h3>
          {localityLine ? (
            <p className={styles.metaLine}>
              <MapPin aria-hidden className={styles.metaIcon} />
              <span>{localityLine}</span>
            </p>
          ) : null}
          {item.styles.length > 0 ? (
            <p className={styles.sub}>{item.styles.slice(0, 3).join(" · ")}</p>
          ) : null}
          <div className={styles.ratingRow}>
            <MarketplaceStars rating={item.rating} />
          </div>
        </Link>
        <div className={styles.footer}>
          <div className={styles.footerMeta}>
            {price ? <span className={styles.price}>From {price}</span> : null}
          </div>
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
      <div className={`${styles.media} ${styles.trainerMedia}`}>
        <Link
          to="/trainers/$slug"
          params={{ slug: item.slug ?? item.id }}
          className={styles.mediaLink}
          tabIndex={-1}
          aria-hidden
        >
          {item.photoUrl ? (
            <img className={styles.image} src={item.photoUrl} alt="" />
          ) : (
            <div className={styles.placeholder} aria-hidden>
              {item.name.slice(0, 1)}
            </div>
          )}
        </Link>
      </div>
      <div className={styles.body}>
        <Link
          to="/trainers/$slug"
          params={{ slug: item.slug ?? item.id }}
          className={styles.copyLink}
        >
          <h3 className={styles.name}>{item.name}</h3>
          {teaches ? <p className={styles.sub}>Teaches at {teaches}</p> : null}
          {item.locality ? (
            <p className={styles.metaLine}>
              <MapPin aria-hidden className={styles.metaIcon} />
              <span>{item.locality}</span>
            </p>
          ) : null}
          <div className={styles.ratingRow}>
            <MarketplaceStars rating={item.rating} />
          </div>
        </Link>
        <div className={styles.footer}>
          <div className={styles.footerMeta} />
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
