import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { visibleAppNav } from "./app-nav";
import { StaffShell } from "./staff-shell";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const items = visibleAppNav(user?.role);

  return (
    <StaffShell subtitle="Staff LMS" navLabel="App" items={items}>
      {children}
    </StaffShell>
  );
}
