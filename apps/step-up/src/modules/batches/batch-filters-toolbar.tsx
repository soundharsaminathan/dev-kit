import { SearchField } from "@dev-ui/components/search-field";
import { Icon } from "@dev-ui/icons";
import { useMemo, useState } from "react";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import {
  type BatchFiltersDraft,
  BatchFiltersPanel,
} from "./batch-filters-panel";
import styles from "./batch-filters-toolbar.module.scss";

export type BatchFiltersToolbarProps = {
  status: string;
  category: string;
  search: string;
  countMatches: (draft: BatchFiltersDraft) => number;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onSearchChange: (search: string) => void;
};

const STATUS_CHIPS = [
  { id: "status:ACTIVE", label: "Active" },
  { id: "status:INACTIVE", label: "Inactive" },
];

const CATEGORY_CHIPS = [
  { id: "category:KIDS", label: "Kids" },
  { id: "category:ADULTS", label: "Adults" },
];

export function BatchFiltersToolbar({
  status,
  category,
  search,
  countMatches,
  onStatusChange,
  onCategoryChange,
  onSearchChange,
}: BatchFiltersToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const quickChips = useMemo(() => [...STATUS_CHIPS, ...CATEGORY_CHIPS], []);

  const selectedQuick = useMemo(() => {
    const ids: string[] = [];
    if (status !== "ALL") ids.push(`status:${status}`);
    if (category !== "ALL") ids.push(`category:${category}`);
    return ids;
  }, [status, category]);

  const hasExtraFilters = status !== "ALL" || category !== "ALL" || Boolean(search);

  const filterDraft: BatchFiltersDraft = {
    status,
    category,
    search,
  };

  function onQuickToggle(id: string) {
    if (id.startsWith("status:")) {
      const next = id.slice("status:".length);
      onStatusChange(status === next ? "ALL" : next);
      return;
    }
    if (id.startsWith("category:")) {
      const next = id.slice("category:".length);
      onCategoryChange(category === next ? "ALL" : next);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.searchBar}>
        <SearchField
          aria-label="Search batches"
          placeholder="Search batches"
          value={search}
          onChange={onSearchChange}
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
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
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

      <BatchFiltersPanel
        isOpen={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={filterDraft}
        countMatches={countMatches}
        onApply={(next) => {
          onStatusChange(next.status);
          onCategoryChange(next.category);
          onSearchChange(next.search);
        }}
      />
    </div>
  );
}
