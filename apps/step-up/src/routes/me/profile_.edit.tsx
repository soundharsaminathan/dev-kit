import { createFileRoute } from "@tanstack/react-router";
import { ProfileEditPage } from "@/modules/social/profile-edit-page";

export const Route = createFileRoute("/me/profile_/edit")({
  component: MeProfileEditPage,
});

function MeProfileEditPage() {
  return <ProfileEditPage backTo="/me/profile" />;
}
