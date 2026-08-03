import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireSystemAdmin } from "@/lib/require-auth";
import { PublicShell } from "@/modules/layout/public-shell";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context, location }) => {
    requireSystemAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <PublicShell>
      <Outlet />
    </PublicShell>
  );
}
