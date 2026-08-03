import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/require-auth";
import { StudioProfileFormPage } from "@/modules/settings/studio-profile-form-page";

export const Route = createFileRoute("/app/settings_/profile")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: StudioProfileFormPage,
});
