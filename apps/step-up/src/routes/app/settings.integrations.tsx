import { createFileRoute } from "@tanstack/react-router";
import { SettingsComingSoon } from "@/modules/settings/ui";

export const Route = createFileRoute("/app/settings/integrations")({
  component: () => (
    <SettingsComingSoon
      title="Integrations"
      description="Connect third-party tools to Step Up from this page once integrations ship."
    />
  ),
});
