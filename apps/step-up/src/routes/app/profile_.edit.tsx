import { createFileRoute } from "@tanstack/react-router";
import { ProfileEditPage } from "@/modules/social/profile-edit-page";

export const Route = createFileRoute("/app/profile_/edit")({
  component: AppProfileEditPage,
});

function AppProfileEditPage() {
  return <ProfileEditPage backTo="/app/profile" />;
}
