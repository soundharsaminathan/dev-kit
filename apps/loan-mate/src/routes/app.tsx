import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireStaff } from "@/lib/require-auth";
import { AppShell } from "@/modules/layout/app-shell";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ context, location }) => {
    requireStaff(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
