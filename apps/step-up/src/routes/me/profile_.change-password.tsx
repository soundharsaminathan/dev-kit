import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordPage } from "@/modules/me/change-password-page";

export const Route = createFileRoute("/me/profile_/change-password")({
  component: MeChangePasswordPage,
});

function MeChangePasswordPage() {
  return <ChangePasswordPage backTo="/me/profile" />;
}
