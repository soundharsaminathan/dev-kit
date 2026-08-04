import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/require-auth";
import { StudioDanceStylesFormPage } from "@/modules/settings/studio-dance-styles-form-page";

export const Route = createFileRoute("/app/settings_/styles")({
  beforeLoad: ({ context, location }) => {
    const user = requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
    if (user.role !== "OWNER") {
      throw redirect({ to: "/app/settings" });
    }
  },
  component: StudioDanceStylesFormPage,
});
