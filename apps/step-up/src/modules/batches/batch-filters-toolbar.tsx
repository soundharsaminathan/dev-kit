import { SearchField } from "@dev-ui/components/search-field";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import styles from "./batch-filters-toolbar.module.scss";

export type BatchStyleChip = {
  id: string;
  label: string;
};

export type BatchFiltersToolbarProps = {
  status: string;
  category: string;
  style: string | null;
  search: string;
  styleChips: BatchStyleChip[];
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onStyleChange: (style: string | null) => void;
  onSearchChange: (search: string) => void;
};

const STATUS_CHIPS = [
  { id: "ALL", label: "All statuses" },
  { id: "ACTIVE", label: "Active" },
  { id: "INACTIVE", label: "Inactive" },
];

const CATEGORY_CHIPS = [
  { id: "ALL", label: "All ages" },
  { id: "KIDS", label: "Kids" },
  { id: "ADULTS", label: "Adults" },
];

export function BatchFiltersToolbar({
  status,
  category,
  style,
  search,
  styleChips,
  onStatusChange,
  onCategoryChange,
  onStyleChange,
  onSearchChange,
}: BatchFiltersToolbarProps) {
  const styleChipRow = [
    { id: "all", label: "All styles" },
    ...styleChips.map((chip) => ({ id: chip.id, label: chip.label })),
  ];

  return (
    <div className={styles.wrap}>
      <SearchField
        aria-label="Search batches"
        placeholder="Search"
        value={search}
        onChange={onSearchChange}
        className={styles.search}
      />

      <div className={styles.chips} role="toolbar" aria-label="Batch filters">
        <FilterChipRow
          chips={STATUS_CHIPS}
          selected={[status]}
          onToggle={onStatusChange}
        />
        <FilterChipRow
          chips={CATEGORY_CHIPS}
          selected={[category]}
          onToggle={onCategoryChange}
        />
        {styleChips.length > 0 ? (
          <FilterChipRow
            chips={styleChipRow}
            selected={[style ?? "all"]}
            onToggle={(id) => onStyleChange(id === "all" ? null : id)}
          />
        ) : null}
      </div>
    </div>
  );
}
