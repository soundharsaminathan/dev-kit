import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { PublicShell } from "@/modules/layout/public-shell";
import {
  AMENITY_OPTIONS,
  WEEKDAY_LABELS,
  type OpeningHours,
} from "@/modules/locations/types";
import { formatPriceFrom } from "@/modules/student-landing/format";
import { BookSheet } from "./book-sheet";
import type { BookSheetTarget } from "./book";
import { MarketplaceStars } from "./stars";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  fetchMarketplaceClass,
  fetchMarketplaceStudio,
  fetchMarketplaceTrainer,
  marketplaceClassQueryKey,
  marketplaceStudioQueryKey,
  marketplaceTrainerQueryKey,
} from "./catalog";
import {
  MarketplaceClassCardView,
  MarketplaceTrainerCardView,
} from "./cards";
import { categoryLabel } from "./search";
import {
  classDetailTitle,
  marketplaceTrainerSlug,
  studioDetailTitle,
  trainerDetailTitle,
} from "./slugs";
import type {
  MarketplaceClassCard,
  MarketplaceClassDetail,
  MarketplaceStudioDetail,
  MarketplaceTrainerCard,
  MarketplaceTrainerDetail,
} from "./types";
import styles from "./detail.module.scss";

type BookTarget = BookSheetTarget;


function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function amenityLabel(id: string): string {
  return AMENITY_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

function hourLines(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const hours = value as OpeningHours;
  return (hours.days ?? []).map((day) => {
    const label = WEEKDAY_LABELS[day.day] ?? `Day ${day.day}`;
    if (day.closed) return `${label}: Closed`;
    if (day.open && day.close) return `${label}: ${day.open}–${day.close}`;
    return label;
  });
}

function useCanonicalSlug(param: string, canonical: string | undefined) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!canonical || canonical === param) return;
    void navigate({ to: ".", params: { slug: canonical }, replace: true });
  }, [canonical, navigate, param]);
}

function useSeo(title: string, path: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | classa`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const created = !link;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    const previousHref = link.getAttribute("href");
    link.href = `${window.location.origin}${path}`;
    return () => {
      document.title = previous;
      if (created) link.remove();
      else if (previousHref) link.setAttribute("href", previousHref);
    };
  }, [path, title]);
}

function DetailStatus({
  loading,
  error,
  onRetry,
  empty,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  empty: boolean;
}) {
  if (loading) {
    return (
      <div className={styles.status}>
        <EmptyState title="Loading listing" />
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.status}>
        <ErrorState
          description={
            error instanceof Error ? error.message : "Could not load this page."
          }
          action={
            <TouchButton variant="primary" onClick={onRetry}>
              Try again
            </TouchButton>
          }
        />
      </div>
    );
  }
  if (empty) {
    return (
      <div className={styles.status}>
        <EmptyState title="Not found" />
      </div>
    );
  }
  return null;
}

export function MarketplaceClassDetailView({
  item,
  onBook,
}: {
  item: MarketplaceClassDetail;
  onBook: () => void;
}) {
  const price = formatPriceFrom(item.priceFrom, item.priceCadence);
  const showBook = item.upcomingSessions.length > 0 && item.canTrial;

  return (
    <article className={styles.page}>
      <div className={styles.hero}>
        {item.coverImageUrl ? (
          <img src={item.coverImageUrl} alt="" />
        ) : (
          <div className={styles.placeholder} aria-hidden>
            {item.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div>
        <p className={styles.kicker}>{item.branchName}</p>
        <h1 className={styles.title}>{item.name}</h1>
        <div className={styles.row}>
          <Link
            to="/studios/$slug"
            params={{ slug: item.studioSlug }}
            className={styles.link}
          >
            {item.studioName}
          </Link>
          {item.locality ? <span className={styles.meta}>{item.locality}</span> : null}
          <MarketplaceStars rating={item.studioRating} label="Studio" />
          {item.trainerRating.visible ? (
            <MarketplaceStars rating={item.trainerRating} label="Trainer" />
          ) : null}
        </div>
      </div>
      {item.scheduleLabel ? <p className={styles.meta}>{item.scheduleLabel}</p> : null}
      {item.nextSessionAt ? (
        <p className={styles.meta}>Next: {formatWhen(item.nextSessionAt)}</p>
      ) : null}
      {item.seatLabel ? <p className={styles.meta}>{item.seatLabel}</p> : null}
      {price ? <p className={styles.meta}>From {price}</p> : null}

      {item.plans.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Plans</h2>
          <ul className={styles.list}>
            {item.plans.map((plan) => (
              <li key={`${plan.name}-${plan.price}`}>
                {plan.name} · {formatPriceFrom(plan.price, plan.cadence)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {item.trainers.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Trainers</h2>
          <ul className={styles.list}>
            {item.trainers.map((trainer) => (
              <li key={trainer.id}>
                <Link
                  to="/trainers/$slug"
                  params={{ slug: trainer.slug }}
                  className={styles.related}
                >
                  <span className={styles.relatedName}>{trainer.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {item.upcomingSessions.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming sessions</h2>
          <ul className={styles.list}>
            {item.upcomingSessions.map((session) => (
              <li key={session.sessionId}>{formatWhen(session.startsAt)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showBook ? (
        <button type="button" className={styles.book} onClick={onBook}>
          Book
        </button>
      ) : null}
    </article>
  );
}

export function MarketplaceStudioDetailView({
  item,
  onBook,
  onBookClass,
  onBookTrainer,
}: {
  item: MarketplaceStudioDetail;
  onBook: () => void;
  onBookClass: (next: MarketplaceClassCard) => void;
  onBookTrainer: (next: MarketplaceTrainerCard) => void;
}) {
  const photos = item.photos.slice(0, 6);
  const canBook = item.canTrial || item.canPrivate || item.canFloorHire;

  return (
    <article className={styles.page}>
      {photos.length > 0 ? (
        <div className={styles.tour}>
          {photos.map((url) => (
            <img key={url} src={url} alt="" />
          ))}
        </div>
      ) : (
        <div className={styles.hero}>
          <div className={styles.placeholder} aria-hidden>
            {item.name.slice(0, 1)}
          </div>
        </div>
      )}
      <div>
        <p className={styles.kicker}>
          {[item.locality, item.city].filter(Boolean).join(" · ")}
        </p>
        <h1 className={styles.title}>{item.name}</h1>
        <div className={styles.row}>
          <MarketplaceStars rating={item.rating} />
          {item.categories.map((category) => (
            <span key={category} className={styles.chip}>
              {categoryLabel(category)}
            </span>
          ))}
          {item.audience === "KIDS" ? (
            <span className={styles.chip}>Kids</span>
          ) : null}
          {item.audience === "ADULTS" ? (
            <span className={styles.chip}>Adults</span>
          ) : null}
        </div>
      </div>
      {item.tagline ? <p className={styles.about}>{item.tagline}</p> : null}
      {item.about ? <p className={styles.about}>{item.about}</p> : null}
      {item.canFloorHire ? (
        <p className={styles.meta}>Floor hire is available at this studio.</p>
      ) : null}

      {item.branches.map((branch) => (
        <section key={branch.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>{branch.name}</h2>
          {branch.address ? <p className={styles.meta}>{branch.address}</p> : null}
          {branch.mapsUrl ? (
            <a
              className={styles.link}
              href={branch.mapsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open map
            </a>
          ) : null}
          {branch.amenities.length > 0 ? (
            <div className={styles.row}>
              {branch.amenities.map((amenity) => (
                <span key={amenity} className={styles.chip}>
                  {amenityLabel(amenity)}
                </span>
              ))}
            </div>
          ) : null}
          {hourLines(branch.openingHours).length > 0 ? (
            <ul className={styles.list}>
              {hourLines(branch.openingHours).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      {item.classes.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Classes</h2>
          {item.classes.map((klass) => (
            <MarketplaceClassCardView
              key={klass.id}
              item={klass}
              onBook={onBookClass}
              bookVisible={Boolean(klass.nextSessionAt)}
            />
          ))}
        </section>
      ) : null}

      {item.trainers.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Trainers</h2>
          {item.trainers.map((trainer) => (
            <MarketplaceTrainerCardView
              key={trainer.id}
              item={trainer}
              onBook={onBookTrainer}
            />
          ))}
        </section>
      ) : null}

      {canBook ? (
        <button type="button" className={styles.book} onClick={onBook}>
          Book
        </button>
      ) : null}
    </article>
  );
}

export function MarketplaceTrainerDetailView({
  item,
  onBook,
}: {
  item: MarketplaceTrainerDetail;
  onBook: () => void;
}) {
  const showBook = item.canTrial || item.canPrivate;

  return (
    <article className={styles.page}>
      <div className={styles.hero}>
        {item.photoUrl ? (
          <img src={item.photoUrl} alt="" />
        ) : (
          <div className={styles.placeholder} aria-hidden>
            {item.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div>
        <h1 className={styles.title}>{item.name}</h1>
        <div className={styles.row}>
          <MarketplaceStars rating={item.rating} />
          {item.categories.map((category) => (
            <span key={category} className={styles.chip}>
              {categoryLabel(category)}
            </span>
          ))}
        </div>
      </div>
      {item.bio ? <p className={styles.about}>{item.bio}</p> : null}
      {item.nextClassAt ? (
        <p className={styles.meta}>Next class: {formatWhen(item.nextClassAt)}</p>
      ) : null}

      {item.studios.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Studios</h2>
          <ul className={styles.list}>
            {item.studios.map((studio) => (
              <li key={studio.id}>
                <Link
                  to="/studios/$slug"
                  params={{ slug: studio.slug }}
                  className={styles.related}
                >
                  <span className={styles.relatedName}>{studio.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {item.classes.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Classes</h2>
          <ul className={styles.list}>
            {item.classes.map((klass) => (
              <li key={klass.id}>
                <Link
                  to="/classes/$slug"
                  params={{ slug: klass.slug }}
                  className={styles.related}
                >
                  <span className={styles.relatedName}>{klass.name}</span>
                  <span className={styles.relatedMeta}>{klass.studioName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showBook ? (
        <button type="button" className={styles.book} onClick={onBook}>
          Book
        </button>
      ) : null}
    </article>
  );
}

function DetailBookSheet({
  book,
  onClose,
}: {
  book: BookTarget | null;
  onClose: () => void;
}) {
  return (
    <BookSheet
      open={Boolean(book)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      target={book}
    />
  );
}

export function MarketplaceClassDetailPage({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: marketplaceClassQueryKey(slug),
    queryFn: () => fetchMarketplaceClass(slug),
  });
  const item = query.data;
  const [book, setBook] = useState<BookTarget | null>(null);
  useCanonicalSlug(slug, item?.slug);
  useSeo(
    item ? classDetailTitle(item) : "Class",
    `/classes/${item?.slug ?? slug}`,
  );

  return (
    <PublicShell nav="student" width="full">
      <DetailStatus
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={!query.isLoading && !query.isError && !item}
      />
      {item ? (
        <MarketplaceClassDetailView
          item={item}
          onBook={() =>
            setBook({
              source: "class",
              studioId: item.studioId,
              studioName: item.studioName,
              batchId: item.id,
              classSlug: item.slug,
              className: item.name,
              audience: item.audience,
              trainerId: item.trainerId,
              trainerName: item.trainerName,
              canTrial: item.canTrial,
              canEnroll: item.canEnroll,
              canPrivate: item.canPrivate,
              canFloorHire: false,
              viewerEnrolled: item.viewerEnrolled,
            })
          }
        />
      ) : null}
      <DetailBookSheet book={book} onClose={() => setBook(null)} />
    </PublicShell>
  );
}

export function MarketplaceStudioDetailPage({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: marketplaceStudioQueryKey(slug),
    queryFn: () => fetchMarketplaceStudio(slug),
  });
  const item = query.data;
  const [book, setBook] = useState<BookTarget | null>(null);
  useCanonicalSlug(slug, item?.slug);
  useSeo(
    item ? studioDetailTitle(item) : "Studio",
    `/studios/${item?.slug ?? slug}`,
  );

  function bookTrainer(next: MarketplaceTrainerCard) {
    if (!item) return;
    const firstClass =
      item.classes.find((klass) => klass.trainerId === next.id) ?? item.classes[0];
    setBook({
      source: "trainer",
      studioId: item.id,
      studioName: item.name,
      batchId: firstClass?.id,
      classSlug: firstClass?.slug,
      className: firstClass?.name,
      audience: firstClass?.audience,
      trainerId: next.id,
      trainerName: next.name,
      canTrial: next.canTrial,
      canPrivate: next.canPrivate,
      canFloorHire: false,
    });
  }

  return (
    <PublicShell nav="student" width="full">
      <DetailStatus
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={!query.isLoading && !query.isError && !item}
      />
      {item ? (
        <MarketplaceStudioDetailView
          item={item}
          onBook={() =>
            setBook({
              source: "studio-detail",
              studioId: item.id,
              studioName: item.name,
              studioSlug: item.slug,
              canTrial: item.canTrial,
              canEnroll: false,
              canPrivate: item.canPrivate,
              canFloorHire: item.canFloorHire,
            })
          }
          onBookClass={(klass) =>
            setBook({
              source: "class",
              studioId: klass.studioId,
              studioName: klass.studioName,
              batchId: klass.id,
              classSlug: klass.slug,
              className: klass.name,
              audience: klass.audience,
              trainerId: klass.trainerId,
              trainerName: klass.trainerName,
              canTrial: klass.canTrial,
              canEnroll: klass.canEnroll,
              canPrivate: false,
              canFloorHire: false,
              viewerEnrolled: klass.viewerEnrolled,
            })
          }
          onBookTrainer={bookTrainer}
        />
      ) : null}
      <DetailBookSheet book={book} onClose={() => setBook(null)} />
    </PublicShell>
  );
}

export function MarketplaceTrainerDetailPage({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: marketplaceTrainerQueryKey(slug),
    queryFn: () => fetchMarketplaceTrainer(slug),
    retry: false,
  });
  const item = query.data;
  const [book, setBook] = useState<BookTarget | null>(null);
  useCanonicalSlug(slug, item ? marketplaceTrainerSlug(item) : undefined);
  useSeo(
    item ? trainerDetailTitle(item) : "Trainer",
    `/trainers/${item ? marketplaceTrainerSlug(item) : slug}`,
  );

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 404) {
      void navigate({ to: "/users/$id", params: { id: slug }, replace: true });
    }
  }, [navigate, query.error, slug]);

  function bookTrainer() {
    if (!item) return;
    const firstClass = item.classes[0];
    const classStudio = firstClass
      ? item.studios.find((studio) => studio.slug === firstClass.studioSlug)
      : undefined;
    const firstStudio =
      classStudio ??
      item.studios.find((studio) => studio.canPrivate) ??
      item.studios[0];
    if (!firstStudio) return;
    setBook({
      source: "trainer",
      studioId: firstStudio.id,
      studioName: firstStudio.name,
      batchId: firstClass?.id,
      classSlug: firstClass?.slug,
      className: firstClass?.name,
      trainerId: item.id,
      trainerName: item.name,
      canTrial: item.canTrial,
      canPrivate: item.canPrivate,
      canFloorHire: false,
    });
  }

  return (
    <PublicShell nav="student" width="full">
      <DetailStatus
        loading={query.isLoading}
        error={
          query.error instanceof ApiError && query.error.status === 404
            ? null
            : query.error
        }
        onRetry={() => void query.refetch()}
        empty={false}
      />
      {item ? (
        <MarketplaceTrainerDetailView item={item} onBook={bookTrainer} />
      ) : null}
      <DetailBookSheet book={book} onClose={() => setBook(null)} />
    </PublicShell>
  );
}
