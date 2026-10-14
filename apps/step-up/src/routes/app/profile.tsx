import { createFileRoute } from "@tanstack/react-router";
import { ProfileMenuPage } from "@/modules/me/profile-menu-page";

export const Route = createFileRoute("/app/profile")({
  component: AppProfilePage,
});

function AppProfilePage() {
  return <ProfileMenuPage variant="app" />;
}
