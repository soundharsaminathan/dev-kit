import { createFileRoute, redirect } from "@tanstack/react-router";
import { StudioFeaturesSettingsPage } from "@/modules/settings/studio-features-settings-page";

export const Route = createFileRoute("/app/settings/features")({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.role !== "OWNER") {
      throw redirect({ to: "/app/settings/profile" });
    }
  },
  component: StudioFeaturesSettingsPage,
});
