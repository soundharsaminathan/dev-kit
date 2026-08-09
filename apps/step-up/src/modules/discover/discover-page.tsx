import { SearchField } from "@dev-ui/components/search-field";
import { Icon } from "@dev-ui/icons";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { BatchCard } from "@/modules/ui/batch-card";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { BatchCardSkeletonList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { batchCategoryForAgeRange } from "./batch-category";
import {
  type DiscoverFiltersDraft,
  DiscoverFiltersPanel,
} from "./discover-filters-panel";
import styles from "./discover-page.module.scss";
import { discoverCtaLabel, isDiscoverCtaMuted, toBatchCardData } from "./types";
import { useDiscoverBatches } from "./use-discover";

const CATEGORY_CHIPS = [
  { id: "ALL", label: "All" },
  { id: "KIDS", label: "Kids" },
  { id: "ADULTS", label: "Adults" },
] as const;

function categoryChipsForPreferred(
  preferred: "KIDS" | "ADULTS" | null,
): Array<{ id: string; label: string }> {
  if (!preferred) return [...CATEGORY_CHIPS];
  const other = preferred === "ADULTS" ? "KIDS" : "ADULTS";
  const byId = Object.fromEntries(
    CATEGORY_CHIPS.map((chip) => [chip.id, chip]),
  ) as Record<string, { id: string; label: string }>;
  return [byId.ALL!, byId[preferred]!, byId[other]!];
}

export function DiscoverPage({
  initialBranchId,
  initialStyle,
  initialIntent,
}: {
  initialBranchId?: string;
  initialStyle?: string;
  initialIntent?: "trial";
} = {}) {
  const { user } = useAuth();
  const { studentId, accounts } = useActiveStudentContext();
  const [category, setCategory] = useState("ALL");
  const [style, setStyle] = useState<string | undefined>(initialStyle);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [branchId] = useState(initialBranchId);

  const preferredCategory = useMemo(() => {
    const active = accounts.find((account) => account.id === studentId);
    if (active?.kind === "KID") return "KIDS" as const;
    if (active && !active.isSelf) return null;
    return batchCategoryForAgeRange(user?.ageRange);
  }, [accounts, studentId, user?.ageRange]);

  const filters: {
    category?: string;
    style?: string;
    search?: string;
    branchId?: string;
    studentId?: string;
  } = {};
  if (category !== "ALL") filters.category = category;
  if (style) filters.style = style;
  if (search) filters.search = search;
  if (branchId) filters.branchId = branchId;
  // Backend defaults students to themselves; only send when viewing a linked account.
  if (studentId && user?.id && studentId !== user.id) {
    filters.studentId = studentId;
  }

  const query = useDiscoverBatches(filters);

  const batches = query.data ?? [];

  const styleChips = useMemo(() => {
    const stylesSet = new Set<string>();
    for (const batch of query.data ?? []) {
      if (batch.styleBadge) stylesSet.add(batch.styleBadge);
    }
    return [...stylesSet].sort().map((name) => ({ id: name, label: name }));
  }, [query.data]);

  const quickChips = useMemo(
    () => [...categoryChipsForPreferred(preferredCategory), ...styleChips],
    [preferredCategory, styleChips],
  );

  const selectedQuick = useMemo(() => {
    const ids = [category];
    if (style) ids.push(style);
    return ids;
  }, [category, style]);

  const hasExtraFilters =
    category !== "ALL" || Boolean(style || search || branchId);

  const filterDraft: DiscoverFiltersDraft = {
    category,
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
    setSearch("");
  }

  return (
    <Screen
      title="Discover"
      subtitle={
        initialIntent === "trial"
          ? "Pick a class and try 2 sessions free."
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
              ? batches.map((batch) => {
                  const ctaLabel = discoverCtaLabel(batch);
                  return (
                    <BatchCard
                      key={batch.id}
                      batch={toBatchCardData(batch)}
                      ctaLabel={ctaLabel}
                      {...(isDiscoverCtaMuted(ctaLabel)
                        ? { ctaTone: "muted" as const }
                        : {})}
                    />
                  );
                })
              : null}
          </div>
        </PullToRefresh>
      </div>

      <DiscoverFiltersPanel
        isOpen={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={filterDraft}
        styleOptions={styleChips}
        preferredCategory={preferredCategory}
        search={search}
        {...(branchId != null ? { branchId } : {})}
        onApply={(next) => {
          setCategory(next.category);
          setStyle(next.style);
        }}
      />
    </Screen>
  );
}
