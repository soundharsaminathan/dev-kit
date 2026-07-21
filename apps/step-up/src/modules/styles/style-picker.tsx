import { DANCE_STYLES, resolveDanceStyle } from "@/lib/dance-styles";
import { StyleIcon } from "./style-icon";
import styles from "./styles.module.scss";

type StylePickerProps = {
  value: string[];
  onChange: (styles: string[]) => void;
};

export function StylePicker({ value, onChange }: StylePickerProps) {
  const selectedLabels = new Set(
    value.map((entry) => resolveDanceStyle(entry).label),
  );

  function toggle(label: string) {
    const next = new Set(selectedLabels);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    onChange(
      DANCE_STYLES.filter((style) => next.has(style.label)).map(
        (style) => style.label,
      ),
    );
  }

  return (
    <div className={styles.picker}>
      {DANCE_STYLES.map((style) => {
        const selected = selectedLabels.has(style.label);
        return (
          <button
            key={style.id}
            type="button"
            className={
              selected
                ? `${styles.pickerItem} ${styles.pickerItemSelected}`
                : styles.pickerItem
            }
            aria-pressed={selected}
            onClick={() => toggle(style.label)}
          >
            <StyleIcon style={style.label} size="md" />
            <span className={styles.pickerLabel}>{style.label}</span>
          </button>
        );
      })}
    </div>
  );
}
