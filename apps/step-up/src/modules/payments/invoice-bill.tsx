import type { ReactNode } from "react";
import styles from "./invoice-bill.module.scss";

export type InvoiceBillLine = {
  id?: string;
  label: string;
  value: string;
  hint?: string;
  variant?: "default" | "discount";
};

type InvoiceBillProps = {
  heading: string;
  meta?: string;
  badge?: ReactNode;
  lines: InvoiceBillLine[];
  totalLabel: string;
  totalValue: string;
  footnote?: string;
};

export function InvoiceBill({
  heading,
  meta,
  badge,
  lines,
  totalLabel,
  totalValue,
  footnote,
}: InvoiceBillProps) {
  return (
    <div className={styles.bill}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.heading}>{heading}</p>
          {meta ? <p className={styles.meta}>{meta}</p> : null}
        </div>
        {badge}
      </div>
      <div className={styles.lines}>
        {lines.map((line) => (
          <div
            key={line.id ?? line.label}
            className={styles.line}
            data-variant={line.variant === "discount" ? "discount" : undefined}
          >
            <span className={styles.lineLabel}>
              {line.label}
              {line.hint ? (
                <span className={styles.lineHint}>{line.hint}</span>
              ) : null}
            </span>
            <span className={styles.lineValue}>{line.value}</span>
          </div>
        ))}
      </div>
      <div className={styles.total}>
        <span className={styles.totalLabel}>{totalLabel}</span>
        <span className={styles.totalValue} data-testid="bill-total">
          {totalValue}
        </span>
      </div>
      {footnote ? <p className={styles.footnote}>{footnote}</p> : null}
    </div>
  );
}
