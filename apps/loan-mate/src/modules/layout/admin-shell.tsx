import type { ReactNode } from "react";
import { type NavItem, StaffShell } from "./staff-shell";

const ADMIN_NAV: readonly NavItem[] = [
  { to: "/admin", label: "Companies", icon: "building", exact: true },
  { to: "/admin/profile", label: "Profile", icon: "user" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <StaffShell subtitle="Platform admin" navLabel="Admin" items={ADMIN_NAV}>
      {children}
    </StaffShell>
  );
}
