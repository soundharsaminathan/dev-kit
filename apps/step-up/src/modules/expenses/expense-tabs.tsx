import { Link } from "@tanstack/react-router";
import styles from "./expenses.module.scss";

const TABS: Array<{
  to:
    | "/app/expenses"
    | "/app/expenses/list"
    | "/app/expenses/reports"
    | "/app/expenses/categories";
  label: string;
  end?: boolean;
}> = [
  { to: "/app/expenses", label: "Dashboard", end: true },
  { to: "/app/expenses/list", label: "All expenses" },
  { to: "/app/expenses/reports", label: "Reports" },
  { to: "/app/expenses/categories", label: "Categories" },
];

export function ExpenseTabs() {
  return (
    <nav className={styles.tabs} aria-label="Expenses sections">
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={styles.tab}
          activeOptions={{ exact: tab.end === true }}
          activeProps={{ "data-active": "true" }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
