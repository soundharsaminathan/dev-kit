import type { ReactNode } from "react";
import { type NavItem, StaffShell } from "./staff-shell";

const APP_NAV: readonly NavItem[] = [
  { to: "/app", label: "Home", icon: "home", exact: true },
  { to: "/app/customers", label: "Customers", icon: "users" },
  { to: "/app/products", label: "Products", icon: "tag" },
  { to: "/app/loans", label: "Loans", icon: "wallet" },
  { to: "/app/approvals", label: "Approvals", icon: "badge-check" },
  { to: "/app/collections", label: "Collections", icon: "credit-card" },
  { to: "/app/users", label: "Employees", icon: "circle-user" },
  { to: "/app/branches", label: "Branches", icon: "building" },
  { to: "/app/audit", label: "Audit", icon: "file-text" },
  { to: "/app/reports", label: "Reports", icon: "chart-bar" },
  { to: "/app/notifications", label: "Notifications", icon: "bell" },
  { to: "/app/settings", label: "Settings", icon: "settings" },
  { to: "/app/profile", label: "Profile", icon: "user" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <StaffShell subtitle="Staff LMS" navLabel="App" items={APP_NAV}>
      {children}
    </StaffShell>
  );
}
