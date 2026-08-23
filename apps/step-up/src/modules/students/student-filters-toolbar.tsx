import { SearchField } from "@dev-ui/components/search-field";
import { Icon } from "@dev-ui/icons";
import { useMemo, useState } from "react";
import { useStudentSearchPlaceholder } from "@/lib/use-student-search-placeholder";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import {
  AGE_RANGE_OPTIONS,
  GENDER_OPTIONS,
  PERIOD_OPTIONS,
  STAGE_OPTIONS,
  type StudentFiltersDraft,
  type StudentFunnelPeriod,
} from "./student-filter-types";
import { StudentFiltersPanel } from "./student-filters-panel";
import styles from "./student-filters-toolbar.module.scss";

export type StudentFiltersToolbarProps = {
  stage: string;
  period: StudentFunnelPeriod;
  ageRange: string;
  gender: string;
  search: string;
  countMatches: (draft: StudentFiltersDraft) => number;
  onStageChange: (stage: string) => void;
  onPeriodChange: (period: StudentFunnelPeriod) => void;
  onAgeRangeChange: (ageRange: string) => void;
  onGenderChange: (gender: string) => void;
  onSearchChange: (search: string) => void;
};

const STAGE_CHIPS = STAGE_OPTIONS.filter((option) => option.id !== "ALL").map(
  (option) => ({
    id: `stage:${option.id}`,
    label: option.label,
  }),
);

const PERIOD_CHIPS = PERIOD_OPTIONS.filter(
  (option) => option.id !== "lifetime",
).map((option) => ({
  id: `period:${option.id}`,
  label: option.label,
}));

const AGE_RANGE_CHIPS = AGE_RANGE_OPTIONS.filter(
  (option) => option.id !== "ALL",
).map((option) => ({
  id: `ageRange:${option.id}`,
  label: option.label,
}));

const GENDER_CHIPS = GENDER_OPTIONS.filter((option) => option.id !== "ALL").map(
  (option) => ({
    id: `gender:${option.id}`,
    label: option.label,
  }),
);

export function StudentFiltersToolbar({
  stage,
  period,
  ageRange,
  gender,
  search,
  countMatches,
  onStageChange,
  onPeriodChange,
  onAgeRangeChange,
  onGenderChange,
  onSearchChange,
}: StudentFiltersToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchPlaceholder = useStudentSearchPlaceholder({
    enabled: !search.trim(),
  });

  const quickChips = useMemo(
    () => [
      ...STAGE_CHIPS,
      ...PERIOD_CHIPS,
      ...AGE_RANGE_CHIPS,
      ...GENDER_CHIPS,
    ],
    [],
  );

  const selectedQuick = useMemo(() => {
    const ids: string[] = [];
    if (stage !== "ALL") ids.push(`stage:${stage}`);
    if (period !== "lifetime") ids.push(`period:${period}`);
    if (ageRange !== "ALL") ids.push(`ageRange:${ageRange}`);
    if (gender !== "ALL") ids.push(`gender:${gender}`);
    return ids;
  }, [stage, period, ageRange, gender]);

  const hasExtraFilters =
    stage !== "ALL" ||
    period !== "lifetime" ||
    ageRange !== "ALL" ||
    gender !== "ALL" ||
    Boolean(search);

  const filterDraft: StudentFiltersDraft = {
    stage,
    period,
    ageRange,
    gender,
    search,
  };

  function onQuickToggle(id: string) {
    if (id.startsWith("stage:")) {
      const next = id.slice("stage:".length);
      onStageChange(stage === next ? "ALL" : next);
      return;
    }
    if (id.startsWith("period:")) {
      const next = id.slice("period:".length) as StudentFunnelPeriod;
      onPeriodChange(period === next ? "lifetime" : next);
      return;
    }
    if (id.startsWith("ageRange:")) {
      const next = id.slice("ageRange:".length);
      onAgeRangeChange(ageRange === next ? "ALL" : next);
      return;
    }
    if (id.startsWith("gender:")) {
      const next = id.slice("gender:".length);
      onGenderChange(gender === next ? "ALL" : next);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.searchBar} data-testid="students-search">
        <SearchField
          aria-label="Search students"
          placeholder={searchPlaceholder}
          value={search}
          onChange={onSearchChange}
        />
      </div>

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

      <StudentFiltersPanel
        isOpen={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={filterDraft}
        countMatches={countMatches}
        onApply={(next) => {
          onStageChange(next.stage);
          onPeriodChange(next.period);
          onAgeRangeChange(next.ageRange);
          onGenderChange(next.gender);
          onSearchChange(next.search);
        }}
      />
    </div>
  );
}
