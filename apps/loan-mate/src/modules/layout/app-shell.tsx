import type { ReactNode } from "react";
import { StaffShell } from "./staff-shell";

const APP_NAV = [
  { to: "/app", label: "Home", exact: true },
  { to: "/app/customers", label: "Customers" },
  { to: "/app/products", label: "Products" },
  { to: "/app/loans", label: "Loans" },
  { to: "/app/approvals", label: "Approvals" },
  { to: "/app/collections", label: "Collections" },
  { to: "/app/users", label: "Employees" },
  { to: "/app/branches", label: "Branches" },
  { to: "/app/audit", label: "Audit" },
  { to: "/app/reports", label: "Reports" },
  { to: "/app/notifications", label: "Notifications" },
  { to: "/app/settings", label: "Settings" },
  { to: "/app/profile", label: "Profile" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <StaffShell subtitle="Staff LMS" navLabel="App" items={APP_NAV}>
      {children}
    </StaffShell>
  );
}
