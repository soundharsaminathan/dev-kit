import { createFileRoute } from "@tanstack/react-router";
import { StudioFeaturesPanel } from "@/modules/settings/studio-features-panel";
import { Screen } from "@/modules/ui/screen";

export const Route = createFileRoute("/admin/studios/$id_/features")({
  component: AdminStudioFeaturesPage,
});

function AdminStudioFeaturesPage() {
  const { id } = Route.useParams();

  return (
    <Screen
      title="Studio features"
      subtitle="Turn modules on or off for this studio. Disabled modules disappear from the app and API."
      showBack
      backTo="/admin"
    >
      <StudioFeaturesPanel studioId={id} />
    </Screen>
  );
}
