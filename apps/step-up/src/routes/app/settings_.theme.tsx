import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/require-auth";
import { StudioThemePage } from "@/modules/settings/studio-theme-page";

export const Route = createFileRoute("/app/settings_/theme")({
  beforeLoad: ({ context, location }) => {
    const user = requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
    if (user.role !== "OWNER") {
      throw redirect({ to: "/app/settings" });
    }
  },
  component: StudioThemePage,
});
