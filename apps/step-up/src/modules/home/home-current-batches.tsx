import { Link } from "@tanstack/react-router";
import type { DiscoverBatch } from "@/modules/discover/types";
import staff from "@/modules/ui/staff.module.scss";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

const HOME_BATCH_LIMIT = 6;

function batchMeta(batch: DiscoverBatch) {
  return [batch.scheduleLabel, batch.branch?.name, batch.styleBadge]
    .filter(Boolean)
    .join(" · ");
}

export function HomeCurrentBatches({
  title,
  batches,
  loading,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  batches: DiscoverBatch[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const visible = batches.slice(0, HOME_BATCH_LIMIT);
  const hasMore = batches.length > HOME_BATCH_LIMIT;

  return (
    <div className={staff.section} data-testid="home-current-batches">
      <p className={staff.sectionTitle}>{title}</p>
      {loading ? (
        <div className={staff.list}>
          <SkeletonBlock height="4.5rem" radius="var(--radius-2xl)" />
          <SkeletonBlock height="4.5rem" radius="var(--radius-2xl)" />
        </div>
      ) : null}
      {!loading && batches.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
      {!loading && visible.length > 0 ? (
        <>
          <ul className={staff.list}>
            {visible.map((batch) => {
              const meta = batchMeta(batch);
              return (
                <li key={batch.id}>
                  <Link
                    to="/app/batches/$id"
                    params={{ id: batch.id }}
                    className={staff.metricCard}
                    aria-label={meta ? `${batch.name}. ${meta}` : batch.name}
                  >
                    <span className={staff.rowTitle}>{batch.name}</span>
                    {meta ? (
                      <span className={staff.rowMeta}>{meta}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          {hasMore ? (
            <TouchButton variant="quiet" fullWidth>
              <Link to="/app/batches">View all batches</Link>
            </TouchButton>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
