import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { StyleIcon } from "./style-icon";
import styles from "./styles.module.scss";

export type StyleFilterChip = {
  id: string;
  label: string;
};

type StyleFilterSelectProps = {
  chips: StyleFilterChip[];
  selected: string | null;
  onSelect: (id: string | null) => void;
};

export function StyleFilterSelect({
  chips,
  selected,
  onSelect,
}: StyleFilterSelectProps) {
  return (
    <div className={styles.filterSelectWrap}>
      <Select
        aria-label="Filter by dance style"
        selectedKey={selected ?? "all"}
        onSelectionChange={(key) => {
          const value = String(key);
          onSelect(value === "all" ? null : value);
        }}
      >
        <SelectTrigger className={styles.filterSelectTrigger}>
          <span className={styles.filterSelectValue}>
            {selected ? <StyleIcon style={selected} size="xs" /> : null}
            <SelectValue placeholder="All styles" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem id="all" textValue="All styles">
            All styles
          </SelectItem>
          {chips.map((chip) => (
            <SelectItem key={chip.id} id={chip.id} textValue={chip.label}>
              <span className={styles.filterOption}>
                <StyleIcon style={chip.label} size="xs" />
                {chip.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
