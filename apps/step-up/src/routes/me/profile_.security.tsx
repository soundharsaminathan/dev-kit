import { createFileRoute } from "@tanstack/react-router";
import { AccountSecurityPage } from "@/modules/me/account-security-page";

export const Route = createFileRoute("/me/profile_/security")({
  component: MeAccountSecurityPage,
});

function MeAccountSecurityPage() {
  return (
    <AccountSecurityPage
      backTo="/me/profile"
      changeEmailTo="/me/profile/change-email"
      changePasswordTo="/me/profile/change-password"
    />
  );
}
