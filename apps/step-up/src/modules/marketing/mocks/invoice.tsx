import { INVOICES } from "./data";
import styles from "./mocks.module.scss";
import { MockApp } from "./shell";

const CHIPS = [
  { id: "all", label: "All", on: true },
  { id: "pending", label: "Pending", on: false },
  { id: "overdue", label: "Overdue", on: false },
  { id: "paid", label: "Paid", on: false },
];

function tone(status: (typeof INVOICES)[number]["status"]) {
  if (status === "PAID") return "ok";
  if (status === "OVERDUE") return "bad";
  return "warn";
}

function hint(status: (typeof INVOICES)[number]["status"]) {
  if (status === "PAID") return "Total paid";
  if (status === "OVERDUE") return "Total due";
  return "Total due";
}

export function InvoiceMock() {
  return (
    <MockApp
      nav="invoices"
      title="Invoices"
      subtitle="Collect payments, combine household invoices, or issue refunds."
    >
      <div className={styles.search}>August 2026</div>
      <div className={styles.chips}>
        {CHIPS.map((chip) => (
          <span
            key={chip.id}
            className={styles.chip}
            data-on={chip.on ? "true" : undefined}
          >
            {chip.label}
          </span>
        ))}
      </div>
      {INVOICES.map((invoice) => {
        const unpaid = invoice.status !== "PAID";
        return (
          <div key={invoice.id} className={styles.invoiceCard}>
            <div className={styles.invoiceTop}>
              <span className={styles.rowTitle}>{invoice.name}</span>
              <span className={styles.badge} data-tone={tone(invoice.status)}>
                {invoice.status}
              </span>
            </div>
            <p className={styles.amount}>{invoice.amount}</p>
            <p className={styles.amountHint}>{hint(invoice.status)}</p>
            <p className={styles.rowMeta}>{invoice.plan}</p>
            <div className={styles.actions}>
              {unpaid ? (
                <span className={`${styles.btn} ${styles.btnSm}`}>
                  Collect payment
                </span>
              ) : (
                <span
                  className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`}
                >
                  Print invoice
                </span>
              )}
            </div>
          </div>
        );
      })}
    </MockApp>
  );
}
