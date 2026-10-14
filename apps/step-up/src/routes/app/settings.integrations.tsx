import { createFileRoute, redirect } from "@tanstack/react-router";
import { StudioIntegrationsFormPage } from "@/modules/settings/studio-integrations-form-page";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

export const Route = createFileRoute("/app/settings/integrations")({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.role !== "OWNER") {
      throw redirect({ to: "/app/settings/profile" });
    }
  },
  component: () => (
    <RequireStudioFeature feature="ai_agent">
      <StudioIntegrationsFormPage />
    </RequireStudioFeature>
  ),
});
