import styles from "./badge.module.scss";
import type { BadgeProps } from "./badge.types";

function Badge({
  appearance = "solid",
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      role="presentation"
      data-badge=""
      className={styles.root}
      data-appearance={appearance}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </span>
  );
}

export type {
  BadgeAppearance,
  BadgeProps,
  BadgeSize,
  BadgeVariant,
} from "./badge.types";
export { Badge };
