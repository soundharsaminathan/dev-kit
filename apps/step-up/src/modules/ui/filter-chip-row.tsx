import type { ReactNode } from "react";
import styles from "./filter-chip-row.module.scss";

export type FilterChip = {
  id: string;
  label: string;
};

type FilterChipRowProps = {
  chips: FilterChip[];
  selected: string[];
  onToggle: (id: string) => void;
  trailing?: ReactNode;
};

export function FilterChipRow({
  chips,
  selected,
  onToggle,
  trailing,
}: FilterChipRowProps) {
  return (
    <div className={styles.row}>
      <ul className={styles.scroll}>
        {chips.map((chip) => {
          const active = selected.includes(chip.id);
          return (
            <li key={chip.id}>
              <button
                type="button"
                className={
                  active ? `${styles.chip} ${styles.chipActive}` : styles.chip
                }
                aria-pressed={active}
                onClick={() => onToggle(chip.id)}
              >
                {chip.label}
              </button>
            </li>
          );
        })}
      </ul>
      {trailing}
    </div>
  );
}
