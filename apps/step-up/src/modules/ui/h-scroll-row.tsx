import type { ReactNode } from "react";
import styles from "./h-scroll-row.module.scss";

type HScrollRowProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function HScrollRow({
  children,
  className,
  "aria-label": ariaLabel,
}: HScrollRowProps) {
  return (
    <ul
      className={[styles.row, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      {children}
    </ul>
  );
}
