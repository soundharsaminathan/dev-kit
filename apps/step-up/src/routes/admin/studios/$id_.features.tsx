import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StudioFeaturesPanel } from "@/modules/settings/studio-features-panel";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/admin/studios/$id_/features")({
  component: AdminStudioFeaturesPage,
});

function AdminStudioFeaturesPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  return (
    <Screen
      title="Studio features"
      subtitle="Turn modules on or off for this studio. Disabled modules disappear from the app and API."
      showBack
      backTo={`/admin/studios/${id}`}
    >
      <StudioFeaturesPanel
        studioId={id}
        headerActions={
          <div className={staff.rowActions}>
            <TouchButton
              variant="default"
              size="sm"
              onClick={() =>
                void navigate({
                  to: "/admin/studios/$id",
                  params: { id },
                })
              }
            >
              Edit studio
            </TouchButton>
          </div>
        }
      />
    </Screen>
  );
}
