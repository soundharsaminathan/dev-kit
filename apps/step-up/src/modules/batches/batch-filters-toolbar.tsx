import { Icon } from "@dev-ui/icons";
import { useMemo, useState } from "react";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import {
  type BatchFiltersDraft,
  BatchFiltersPanel,
} from "./batch-filters-panel";
import styles from "./batch-filters-toolbar.module.scss";

export type BatchStyleChip = {
  id: string;
  label: string;
};

export type BatchFiltersToolbarProps = {
  status: string;
  category: string;
  trial: string;
  style: string | null;
  search: string;
  styleChips: BatchStyleChip[];
  countMatches: (draft: BatchFiltersDraft) => number;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onTrialChange: (trial: string) => void;
  onStyleChange: (style: string | null) => void;
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

const TRIAL_CHIPS = [
  { id: "trial:TRIAL", label: "Trial only" },
  { id: "trial:NON_TRIAL", label: "Non-trial" },
];

export function BatchFiltersToolbar({
  status,
  category,
  trial,
  style,
  search,
  styleChips,
  countMatches,
  onStatusChange,
  onCategoryChange,
  onTrialChange,
  onStyleChange,
  onSearchChange,
}: BatchFiltersToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const quickChips = useMemo(
    () => [
      ...STATUS_CHIPS,
      ...CATEGORY_CHIPS,
      ...TRIAL_CHIPS,
      ...styleChips.map((chip) => ({
        id: `style:${chip.id}`,
        label: chip.label,
      })),
    ],
    [styleChips],
  );

  const selectedQuick = useMemo(() => {
    const ids: string[] = [];
    if (status !== "ALL") ids.push(`status:${status}`);
    if (category !== "ALL") ids.push(`category:${category}`);
    if (trial !== "ALL") ids.push(`trial:${trial}`);
    if (style) ids.push(`style:${style}`);
    return ids;
  }, [status, category, trial, style]);

  const hasExtraFilters =
    status !== "ALL" ||
    category !== "ALL" ||
    trial !== "ALL" ||
    Boolean(style || search);

  const filterDraft: BatchFiltersDraft = {
    status,
    category,
    trial,
    style,
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
      return;
    }
    if (id.startsWith("trial:")) {
      const next = id.slice("trial:".length);
      onTrialChange(trial === next ? "ALL" : next);
      return;
    }
    if (id.startsWith("style:")) {
      const next = id.slice("style:".length);
      onStyleChange(style === next ? null : next);
    }
  }

  return (
    <div className={styles.wrap}>
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

      <BatchFiltersPanel
        isOpen={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={filterDraft}
        styleOptions={styleChips}
        countMatches={countMatches}
        onApply={(next) => {
          onStatusChange(next.status);
          onCategoryChange(next.category);
          onTrialChange(next.trial);
          onStyleChange(next.style);
          onSearchChange(next.search);
        }}
      />
    </div>
  );
}
