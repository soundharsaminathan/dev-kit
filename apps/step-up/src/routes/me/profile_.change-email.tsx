import { createFileRoute } from "@tanstack/react-router";
import { ChangeEmailPage } from "@/modules/me/change-email-page";

export const Route = createFileRoute("/me/profile_/change-email")({
  component: MeChangeEmailPage,
});

function MeChangeEmailPage() {
  return <ChangeEmailPage backTo="/me/profile/security" />;
}
