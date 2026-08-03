import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/require-auth";
import { StudioTeamFormPage } from "@/modules/settings/studio-team-form-page";

export const Route = createFileRoute("/app/settings_/team")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: StudioTeamFormPage,
});
