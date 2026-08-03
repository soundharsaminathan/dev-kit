import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useStudioId } from "@/lib/use-studio-id";
import type { BatchFiltersDraft } from "@/modules/batches/batch-filters-panel";
import { BatchFiltersToolbar } from "@/modules/batches/batch-filters-toolbar";
import { type DiscoverBatch, toBatchCardData } from "@/modules/discover/types";
import { BatchCard } from "@/modules/ui/batch-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { BatchCardSkeletonList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./batches.module.scss";

export const Route = createFileRoute("/app/batches/")({
  component: BatchesPage,
});

function matchesSearch(batch: DiscoverBatch, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const trainerNames = batch.trainers
    .map((entry) => entry.trainer.name)
    .join(" ");
  const haystack = [
    batch.name,
    batch.styleBadge,
    batch.scheduleLabel,
    batch.branch?.name,
    trainerNames,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function applyDraft(
  items: DiscoverBatch[],
  draft: BatchFiltersDraft,
): DiscoverBatch[] {
  let next = items;
  if (draft.status === "ACTIVE") {
    next = next.filter((batch) => batch.active);
  }
  if (draft.status === "INACTIVE") {
    next = next.filter((batch) => !batch.active);
  }
  if (draft.category !== "ALL") {
    next = next.filter((batch) => batch.category === draft.category);
  }
  if (draft.style) {
    next = next.filter((batch) => batch.styleBadge === draft.style);
  }
  if (draft.search) {
    next = next.filter((batch) => matchesSearch(batch, draft.search));
  }
  return next;
}

function BatchesPage() {
  const api = useApi();
  const studioId = useStudioId();
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [style, setStyle] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["batches", studioId],
    queryFn: () => api.get<DiscoverBatch[]>(`/batches/studio/${studioId}`),
  });

  const styleChips = useMemo(() => {
    const stylesSet = new Set<string>();
    for (const batch of query.data ?? []) {
      if (batch.styleBadge) stylesSet.add(batch.styleBadge);
    }
    return [...stylesSet].sort().map((name) => ({ id: name, label: name }));
  }, [query.data]);

  const filtered = useMemo(
    () =>
      applyDraft(query.data ?? [], {
        status,
        category,
        style,
        search,
      }),
    [query.data, status, category, style, search],
  );

  function countMatches(draft: BatchFiltersDraft) {
    return applyDraft(query.data ?? [], draft).length;
  }

  function clearFilters() {
    setStatus("ALL");
    setCategory("ALL");
    setStyle(null);
    setSearch("");
  }

  return (
    <Screen
      title="Batches"
      subtitle="Create and manage class batches."
      actions={
        <TouchButton variant="primary" size="md">
          <Link to="/app/batches/new">Add</Link>
        </TouchButton>
      }
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={staff.section}>
          <BatchFiltersToolbar
            status={status}
            category={category}
            style={style}
            search={search}
            styleChips={styleChips}
            countMatches={countMatches}
            onStatusChange={setStatus}
            onCategoryChange={setCategory}
            onStyleChange={setStyle}
            onSearchChange={setSearch}
          />

          {query.isLoading ? <BatchCardSkeletonList count={3} /> : null}

          {query.isError ? (
            <ErrorState
              description={
                query.error instanceof Error
                  ? query.error.message
                  : "Could not load batches."
              }
              action={
                <TouchButton variant="primary" onClick={() => query.refetch()}>
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {query.data && query.data.length === 0 ? (
            <EmptyState
              icon={ENTITY_ICONS.batch}
              title="No batches yet"
              description="Create a batch to schedule classes."
              action={
                <TouchButton variant="primary">
                  <Link to="/app/batches/new">Add batch</Link>
                </TouchButton>
              }
            />
          ) : null}

          {query.data && query.data.length > 0 && filtered.length === 0 ? (
            <EmptyState
              icon={ENTITY_ICONS.batch}
              title="No batches found"
              description="Try another filter or clear your search."
              action={
                <TouchButton variant="primary" onClick={clearFilters}>
                  Clear filters
                </TouchButton>
              }
            />
          ) : null}

          {filtered.length > 0 ? (
            <div className={styles.list}>
              {filtered.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={toBatchCardData(batch)}
                  detailTo="/app/batches/$id"
                  ctaLabel="Manage"
                />
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
