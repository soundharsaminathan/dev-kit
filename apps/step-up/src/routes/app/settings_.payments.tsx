import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/require-auth";
import { StudioPaymentsFormPage } from "@/modules/settings/studio-payments-form-page";

export const Route = createFileRoute("/app/settings_/payments")({
  beforeLoad: ({ context, location }) => {
    const user = requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
    if (user.role !== "OWNER") {
      throw redirect({ to: "/app/settings" });
    }
  },
  component: StudioPaymentsFormPage,
});
