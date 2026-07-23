import { createFileRoute } from "@tanstack/react-router";
import { AccountSecurityPage } from "@/modules/me/account-security-page";

export const Route = createFileRoute("/app/profile_/security")({
  component: AppAccountSecurityPage,
});

function AppAccountSecurityPage() {
  return (
    <AccountSecurityPage
      backTo="/app/profile"
      changeEmailTo="/app/profile/change-email"
      changePasswordTo="/app/profile/change-password"
    />
  );
}
