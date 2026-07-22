import { Icon } from "@dev-ui/icons";
import { useMemo, useState } from "react";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { BatchCard } from "@/modules/ui/batch-card";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { FormInput } from "@/modules/ui/form-input";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { BatchCardSkeletonList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
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
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
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

  const styleChips = useMemo(() => {
    const stylesSet = new Set<string>();
    for (const batch of query.data ?? []) {
      if (batch.styleBadge) stylesSet.add(batch.styleBadge);
    }
    return [...stylesSet].sort().map((name) => ({ id: name, label: name }));
  }, [query.data]);

  const hasExtraFilters = Boolean(style || search || branchId);

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
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={styles.root}>
          <div className={styles.filters}>
            <FilterChipRow
              chips={CATEGORY_CHIPS}
              selected={[category]}
              onToggle={(id) => setCategory(id)}
            />
            <button
              type="button"
              className={styles.filterBtn}
              data-active={hasExtraFilters ? "true" : undefined}
              aria-label="More filters"
              onClick={() => setFiltersOpen(true)}
            >
              <Icon name="filter" />
            </button>
          </div>

          {styleChips.length > 0 ? (
            <FilterChipRow
              chips={[{ id: "ALL_STYLES", label: "Any style" }, ...styleChips]}
              selected={[style ?? "ALL_STYLES"]}
              onToggle={(id) => setStyle(id === "ALL_STYLES" ? undefined : id)}
            />
          ) : null}

          {query.isLoading ? <BatchCardSkeletonList count={4} /> : null}

          {query.isError ? (
            <ErrorState
              description={
                query.error instanceof Error
                  ? query.error.message
                  : "Could not load classes."
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
              title="No classes found"
              description="Try another style or clear your filters."
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => {
                    setCategory("ALL");
                    setStyle(undefined);
                    setSearch("");
                  }}
                >
                  Clear filters
                </TouchButton>
              }
            />
          ) : null}

          {query.data && query.data.length > 0 ? (
            <div className={styles.list}>
              {query.data.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={toBatchCardData(batch)}
                  ctaLabel={discoverCtaLabel(batch)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>

      <AppBottomSheet
        isOpen={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters"
      >
        <div className={styles.filterForm}>
          <FormInput
            label="Search"
            value={draftSearch}
            onChange={setDraftSearch}
            placeholder="Class name"
          />
          <div className={styles.filterActions}>
            <TouchButton
              variant="quiet"
              onClick={() => {
                setDraftSearch("");
                setSearch("");
                setStyle(undefined);
                setFiltersOpen(false);
              }}
            >
              Reset
            </TouchButton>
            <TouchButton
              variant="primary"
              onClick={() => {
                setSearch(draftSearch.trim());
                setFiltersOpen(false);
              }}
            >
              Apply
            </TouchButton>
          </div>
        </div>
      </AppBottomSheet>
    </Screen>
  );
}
