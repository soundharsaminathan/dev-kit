import { createFileRoute } from "@tanstack/react-router";
import { SettingsComingSoon } from "@/modules/settings/ui";

export const Route = createFileRoute("/app/settings/chat")({
  component: () => (
    <SettingsComingSoon
      title="Chat"
      description="Messaging defaults for staff and students will be configurable here soon."
    />
  ),
});
