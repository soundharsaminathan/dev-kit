import { createFileRoute } from "@tanstack/react-router";
import { SettingsComingSoon } from "@/modules/settings/ui";

export const Route = createFileRoute("/app/settings/notifications")({
  component: () => (
    <SettingsComingSoon
      title="Notifications"
      description="Studio-wide notification preferences will live here. For now, manage personal alerts from the header notifications panel."
    />
  ),
});
