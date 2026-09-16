import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/modules/layout/public-shell";
import { fetchDiscoverStudio } from "@/modules/student-landing/api";
import {
  formatPriceFrom,
  formatRating,
} from "@/modules/student-landing/format";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./studio.module.scss";

export const Route = createFileRoute("/studio/$studioId")({
  component: StudioPage,
});

function StudioPage() {
  const { studioId } = Route.useParams();
  const query = useQuery({
    queryKey: ["discover-studio", studioId],
    queryFn: () => fetchDiscoverStudio(studioId),
  });

  const studio = query.data;
  const registerSearch = {
    for: "student" as const,
    redirect: `/studio/${studio?.slug || studioId}`,
    studioId: studio?.id || studioId,
  };

  const rating = studio
    ? formatRating(studio.ratingAvg, studio.ratingCount)
    : null;
  const price = studio
    ? formatPriceFrom(studio.priceFrom, studio.priceCadence)
    : null;

  return (
    <PublicShell nav="student" width="full">
      <section className={styles.page}>
        {query.isLoading ? (
          <>
            <SkeletonBlock height="12rem" />
            <SkeletonBlock height="2rem" width="60%" />
            <SkeletonBlock height="6rem" />
          </>
        ) : null}
        {query.isError ? (
          <ErrorState
            description={
              query.error instanceof Error
                ? query.error.message
                : "Could not load studio."
            }
          />
        ) : null}
        {studio ? (
          <>
            {studio.imageUrl ||
            studio.heroDesktopUrl ||
            studio.heroMobileUrl ? (
              <img
                className={styles.hero}
                src={
                  studio.heroDesktopUrl ||
                  studio.heroMobileUrl ||
                  studio.imageUrl ||
                  ""
                }
                alt=""
              />
            ) : (
              <div className={styles.heroPlaceholder} aria-hidden>
                {studio.name.slice(0, 1)}
              </div>
            )}
            <p className={styles.eyebrow}>
              {[studio.city, studio.styles.slice(0, 2).join(" · ")]
                .filter(Boolean)
                .join(" · ") || "Studio"}
            </p>
            <h1 className={styles.title}>{studio.name}</h1>
            <p className={styles.lead}>
              Train with confidence. Book a trial, join a batch, or visit us in
              person.
            </p>
            <div className={styles.metaRow}>
              {rating ? <span>★ {rating}</span> : null}
              {studio.batchCount > 0 ? (
                <span>
                  {studio.batchCount} class
                  {studio.batchCount === 1 ? "" : "es"}
                </span>
              ) : null}
              {studio.timingLabel ? <span>{studio.timingLabel}</span> : null}
              {price ? <span>From {price}</span> : null}
            </div>
            {studio.address || studio.contact ? (
              <div className={styles.card}>
                {studio.address ? (
                  <>
                    <p className={styles.label}>Address</p>
                    <p>{studio.address}</p>
                  </>
                ) : null}
                {studio.contact ? (
                  <>
                    <p className={styles.label}>Contact</p>
                    <p>{studio.contact}</p>
                  </>
                ) : null}
              </div>
            ) : null}
            {studio.batches.length > 0 ? (
              <div className={styles.batches}>
                <h2 className={styles.batchesTitle}>Classes</h2>
                <ul className={styles.batchList}>
                  {studio.batches.map((batch) => {
                    const batchPrice = formatPriceFrom(
                      batch.priceFrom,
                      batch.priceCadence,
                    );
                    const batchRating = formatRating(
                      batch.ratingAvg,
                      batch.ratingCount,
                    );
                    return (
                      <li key={batch.id} className={styles.batchItem}>
                        <div>
                          <p className={styles.batchName}>{batch.name}</p>
                          <p className={styles.batchMeta}>
                            {[
                              batch.category === "KIDS" ? "Kids" : "Adults",
                              batch.styles[0],
                              batch.timingLabel,
                              batchRating ? `★ ${batchRating}` : null,
                              batchPrice,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            <div className={styles.actions}>
              <TouchButton
                as={Link}
                to="/register"
                search={registerSearch as never}
                variant="primary"
                fullWidth
              >
                Join this studio
              </TouchButton>
              <TouchButton
                as={Link}
                to="/login"
                search={{ studioId: studio.id } as never}
                variant="quiet"
                fullWidth
              >
                Sign in to book
              </TouchButton>
              <TouchButton as={Link} to="/discover" variant="quiet" fullWidth>
                Back to discover
              </TouchButton>
            </div>
          </>
        ) : null}
        {!query.isLoading && !query.isError && !studio ? (
          <EmptyState title="Studio not found" />
        ) : null}
      </section>
    </PublicShell>
  );
}
