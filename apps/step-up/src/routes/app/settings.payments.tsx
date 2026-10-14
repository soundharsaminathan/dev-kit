import { createFileRoute, redirect } from "@tanstack/react-router";
import { StudioPaymentsFormPage } from "@/modules/settings/studio-payments-form-page";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

export const Route = createFileRoute("/app/settings/payments")({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.role !== "OWNER") {
      throw redirect({ to: "/app/settings/profile" });
    }
  },
  component: () => (
    <RequireStudioFeature feature="payments">
      <StudioPaymentsFormPage />
    </RequireStudioFeature>
  ),
});
