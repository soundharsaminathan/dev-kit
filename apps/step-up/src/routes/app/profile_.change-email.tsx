import { createFileRoute } from "@tanstack/react-router";
import { ChangeEmailPage } from "@/modules/me/change-email-page";

export const Route = createFileRoute("/app/profile_/change-email")({
  component: AppChangeEmailPage,
});

function AppChangeEmailPage() {
  return <ChangeEmailPage backTo="/app/profile/security" />;
}
