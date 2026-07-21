import { StyleIcon } from "./style-icon";
import styles from "./styles.module.scss";

type StyleListProps = {
  styles: string[];
  size?: "xs" | "sm" | "md" | "lg";
  showLabels?: boolean;
  emptyLabel?: string;
  className?: string | undefined;
};

export function StyleList({
  styles: styleValues,
  size = "md",
  showLabels = false,
  emptyLabel,
  className,
}: StyleListProps) {
  if (styleValues.length === 0) {
    return emptyLabel ? <p className={styles.empty}>{emptyLabel}</p> : null;
  }

  const rootClass = [
    showLabels ? styles.listWithLabels : styles.list,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      {styleValues.map((style) => (
        <StyleIcon
          key={style}
          style={style}
          size={size}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
}
