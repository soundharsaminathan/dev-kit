import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireSystemAdmin } from "@/lib/require-auth";
import { AdminShell } from "@/modules/layout/admin-shell";

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
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
