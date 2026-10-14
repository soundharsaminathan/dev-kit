import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/require-auth";
import { SettingsLayout } from "@/modules/settings/ui";

export const Route = createFileRoute("/app/settings")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: SettingsRouteLayout,
});

function SettingsRouteLayout() {
  return (
    <SettingsLayout paddedSave>
      <Outlet />
    </SettingsLayout>
  );
}
