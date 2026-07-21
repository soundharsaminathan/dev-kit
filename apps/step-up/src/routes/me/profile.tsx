import { createFileRoute } from "@tanstack/react-router";
import { ProfileMenuPage } from "@/modules/me/profile-menu-page";

export const Route = createFileRoute("/me/profile")({
  component: MeProfilePage,
});

function MeProfilePage() {
  return <ProfileMenuPage />;
}
