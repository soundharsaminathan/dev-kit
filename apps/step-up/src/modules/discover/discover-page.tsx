import { SearchField } from "@dev-ui/components/search-field";
import { Icon } from "@dev-ui/icons";
import { useMemo, useState } from "react";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { BatchCard } from "@/modules/ui/batch-card";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { BatchCardSkeletonList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  applyTrialFilter,
  type DiscoverFiltersDraft,
  DiscoverFiltersPanel,
} from "./discover-filters-panel";
import styles from "./discover-page.module.scss";
import { discoverCtaLabel, toBatchCardData } from "./types";
import { useDiscoverBatches } from "./use-discover";

const CATEGORY_CHIPS = [
  { id: "ALL", label: "All" },
  { id: "KIDS", label: "Kids" },
  { id: "ADULTS", label: "Adults" },
];

export function DiscoverPage({
  initialBranchId,
  initialStyle,
  initialIntent,
}: {
  initialBranchId?: string;
  initialStyle?: string;
  initialIntent?: "trial";
} = {}) {
  const [category, setCategory] = useState("ALL");
  const [style, setStyle] = useState<string | undefined>(initialStyle);
  const [trial, setTrial] = useState(
    initialIntent === "trial" ? "TRIAL" : "ALL",
  );
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [branchId] = useState(initialBranchId);

  const filters: {
    category?: string;
    style?: string;
    search?: string;
    branchId?: string;
  } = {};
  if (category !== "ALL") filters.category = category;
  if (style) filters.style = style;
  if (search) filters.search = search;
  if (branchId) filters.branchId = branchId;

  const query = useDiscoverBatches(filters);

  const batches = useMemo(
    () => applyTrialFilter(query.data ?? [], trial),
    [query.data, trial],
  );

  const styleChips = useMemo(() => {
    const stylesSet = new Set<string>();
    for (const batch of query.data ?? []) {
      if (batch.styleBadge) stylesSet.add(batch.styleBadge);
    }
    return [...stylesSet].sort().map((name) => ({ id: name, label: name }));
  }, [query.data]);

  const quickChips = useMemo(
    () => [...CATEGORY_CHIPS, ...styleChips],
    [styleChips],
  );

  const selectedQuick = useMemo(() => {
    const ids = [category];
    if (style) ids.push(style);
    return ids;
  }, [category, style]);

  const hasExtraFilters =
    category !== "ALL" ||
    trial !== "ALL" ||
    Boolean(style || search || branchId);

  const filterDraft: DiscoverFiltersDraft = {
    category,
    trial,
    ...(style ? { style } : {}),
  };

  function onQuickToggle(id: string) {
    if (id === "ALL" || id === "KIDS" || id === "ADULTS") {
      setCategory(id);
      return;
    }
    setStyle((prev) => (prev === id ? undefined : id));
  }

  function clearFilters() {
    setCategory("ALL");
    setStyle(undefined);
    setTrial("ALL");
    setSearch("");
  }

  return (
    <Screen
      title="Discover"
      subtitle={
        initialIntent === "trial"
          ? "Pick a class and book your free trial."
          : branchId
            ? "Classes at this location."
            : "Find a class by style, level, or schedule."
      }
      hideHeaderOnMobile
      className={styles.screen ?? ""}
    >
      <div className={styles.root}>
        <div className={styles.toolbar}>
          <div className={styles.searchBar}>
            <SearchField
              aria-label="Search classes"
              placeholder="Search classes"
              value={search}
              onChange={setSearch}
              className={styles.search}
            />
          </div>

          <div className={styles.filters}>
            <FilterChipRow
              chips={quickChips}
              selected={selectedQuick}
              onToggle={onQuickToggle}
              leading={
                <button
                  type="button"
                  className={styles.filterBtn}
                  data-active={hasExtraFilters ? "true" : undefined}
                  aria-label="Open filters"
                  onClick={() => setFiltersOpen(true)}
                >
                  <Icon name="filter" className={styles.filterBtnIcon} />
                  {hasExtraFilters ? (
                    <span className={styles.filterDot} aria-hidden />
                  ) : null}
                </button>
              }
            />
          </div>
        </div>

        <PullToRefresh
          className={styles.scroller ?? ""}
          onRefresh={() => query.refetch()}
        >
          <div className={styles.list}>
            {query.isLoading ? <BatchCardSkeletonList count={4} /> : null}

            {query.isError ? (
              <ErrorState
                description={
                  query.error instanceof Error
                    ? query.error.message
                    : "Could not load classes."
                }
                action={
                  <TouchButton
                    variant="primary"
                    onClick={() => query.refetch()}
                  >
                    Try again
                  </TouchButton>
                }
              />
            ) : null}

            {query.data && batches.length === 0 ? (
              <EmptyState
                icon={ENTITY_ICONS.batch}
                title="No classes found"
                description="Try another style or clear your filters."
                action={
                  <TouchButton variant="primary" onClick={clearFilters}>
                    Clear filters
                  </TouchButton>
                }
              />
            ) : null}

            {batches.length > 0
              ? batches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={toBatchCardData(batch)}
                    ctaLabel={discoverCtaLabel(batch)}
                  />
                ))
              : null}
          </div>
        </PullToRefresh>
      </div>

      <DiscoverFiltersPanel
        isOpen={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={filterDraft}
        styleOptions={styleChips}
        search={search}
        {...(branchId != null ? { branchId } : {})}
        onApply={(next) => {
          setCategory(next.category);
          setTrial(next.trial);
          setStyle(next.style);
        }}
      />
    </Screen>
  );
}
