import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordPage } from "@/modules/me/change-password-page";

export const Route = createFileRoute("/app/profile_/change-password")({
  component: AppChangePasswordPage,
});

function AppChangePasswordPage() {
  return <ChangePasswordPage backTo="/app/profile" />;
}
