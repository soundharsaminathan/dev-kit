import type { ReactNode } from "react";
import { StaffShell } from "./staff-shell";

const ADMIN_NAV = [
  { to: "/admin", label: "Companies", exact: true },
  { to: "/admin/profile", label: "Profile" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <StaffShell subtitle="Platform admin" navLabel="Admin" items={ADMIN_NAV}>
      {children}
    </StaffShell>
  );
}
