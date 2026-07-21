import { Button } from "@dev-ui/components/button";
import { Menu, MenuContent, MenuItem } from "@dev-ui/components/menu";
import { SearchField } from "@dev-ui/components/search-field";
import type { ReactNode } from "react";
import { StyleIcon } from "@/modules/styles/style-icon";
import styles from "./batch-filters-toolbar.module.scss";

type SelectionKey = string | number;

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

const STATUS_OPTIONS = [
  { id: "ALL", label: "All statuses" },
  { id: "ACTIVE", label: "Active" },
  { id: "INACTIVE", label: "Inactive" },
];

const CATEGORY_OPTIONS = [
  { id: "ALL", label: "All ages" },
  { id: "KIDS", label: "Kids" },
  { id: "ADULTS", label: "Adults" },
];

function firstKey(keys: "all" | Set<SelectionKey>): string | null {
  if (keys === "all") return null;
  const [key] = keys;
  return key == null ? null : String(key);
}

function FilterMenu({
  label,
  filled,
  selectedKey,
  options,
  onSelect,
}: {
  label: string;
  filled: boolean;
  selectedKey: string;
  options: { id: string; label: string; children?: ReactNode }[];
  onSelect: (id: string) => void;
}) {
  return (
    <Menu className={styles.menu}>
      <Button
        variant="quiet"
        size="sm"
        className={styles.trigger}
        data-filled={filled || undefined}
        aria-label={label}
      >
        <span className={styles.triggerLabel}>
          {label}
          {filled ? <span className={styles.dot} aria-hidden /> : null}
        </span>
      </Button>
      <MenuContent
        selectionMode="single"
        selectedKeys={new Set([selectedKey])}
        onSelectionChange={(keys) => {
          const next = firstKey(keys);
          if (next != null) onSelect(next);
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.id} id={option.id} textValue={option.label}>
            {option.children ?? option.label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

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
  const styleOptions = [
    { id: "all", label: "All styles" },
    ...styleChips.map((chip) => ({
      id: chip.id,
      label: chip.label,
      children: (
        <span className={styles.styleItem}>
          <StyleIcon style={chip.label} size="xs" />
          {chip.label}
        </span>
      ),
    })),
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

      <div className={styles.toolbar} role="toolbar" aria-label="Batch filters">
        <FilterMenu
          label="Status"
          filled={status !== "ALL"}
          selectedKey={status}
          options={STATUS_OPTIONS}
          onSelect={onStatusChange}
        />
        <FilterMenu
          label="Age"
          filled={category !== "ALL"}
          selectedKey={category}
          options={CATEGORY_OPTIONS}
          onSelect={onCategoryChange}
        />
        {styleChips.length > 0 ? (
          <FilterMenu
            label="Style"
            filled={Boolean(style)}
            selectedKey={style ?? "all"}
            options={styleOptions}
            onSelect={(id) => onStyleChange(id === "all" ? null : id)}
          />
        ) : null}
      </div>
    </div>
  );
}
