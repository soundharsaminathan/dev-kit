import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/require-auth";
import { StudioPaymentsFormPage } from "@/modules/settings/studio-payments-form-page";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

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
  component: () => (
    <RequireStudioFeature feature="payments">
      <StudioPaymentsFormPage />
    </RequireStudioFeature>
  ),
});
