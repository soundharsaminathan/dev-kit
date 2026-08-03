import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/require-auth";
import { StudioBillingFormPage } from "@/modules/settings/studio-billing-form-page";

export const Route = createFileRoute("/app/settings_/billing")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: StudioBillingFormPage,
});
