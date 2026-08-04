import { type DanceStyle, resolveDanceStyle } from "@/lib/dance-styles";
import { useStudioDanceStyles } from "@/lib/use-studio-dance-styles";
import { StyleIcon } from "./style-icon";
import styles from "./styles.module.scss";

type StylePickerProps = {
  value: string[];
  onChange: (styles: string[]) => void;
  catalog?: DanceStyle[];
};

export function StylePicker({
  value,
  onChange,
  catalog: catalogProp,
}: StylePickerProps) {
  const { styles: studioStyles } = useStudioDanceStyles();
  const catalog = catalogProp ?? studioStyles;
  const selectedLabels = new Set(
    value.map((entry) => resolveDanceStyle(entry, catalog).label),
  );

  function toggle(label: string) {
    const next = new Set(selectedLabels);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    onChange(
      catalog
        .filter((style) => next.has(style.label))
        .map((style) => style.label),
    );
  }

  return (
    <div className={styles.picker}>
      {catalog.map((style) => {
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
            <StyleIcon style={style.label} size="md" catalog={catalog} />
            <span className={styles.pickerLabel}>{style.label}</span>
          </button>
        );
      })}
    </div>
  );
}
