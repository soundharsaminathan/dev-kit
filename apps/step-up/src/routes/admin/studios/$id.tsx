import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import {
  StudioWizard,
  type StudioWizardStudio,
} from "@/modules/admin/studio-wizard";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/admin/studios/$id")({
  component: AdminEditStudioPage,
});

function AdminEditStudioPage() {
  const { id } = Route.useParams();
  const api = useApi();

  const studioQuery = useQuery({
    queryKey: ["admin", "studio", id],
    queryFn: () => api.get<StudioWizardStudio>(`/studios/${id}`),
  });

  if (studioQuery.isLoading) {
    return (
      <Screen title="Edit studio" showBack backTo="/admin">
        <SkeletonBlock height="12rem" />
      </Screen>
    );
  }

  if (studioQuery.isError) {
    return (
      <Screen title="Edit studio" showBack backTo="/admin">
        <ErrorState
          description={
            studioQuery.error instanceof Error
              ? studioQuery.error.message
              : "Could not load studio."
          }
          action={
            <TouchButton
              variant="primary"
              onClick={() => studioQuery.refetch()}
            >
              Try again
            </TouchButton>
          }
        />
      </Screen>
    );
  }

  if (!studioQuery.data) {
    return (
      <Screen title="Edit studio" showBack backTo="/admin">
        <EmptyState
          title="Studio not found"
          description="This studio may have been deleted."
        />
      </Screen>
    );
  }

  const studio = studioQuery.data;

  return (
    <StudioWizard
      mode="edit"
      studio={{
        ...studio,
        address: studio.address ?? "",
        contact: studio.contact ?? "",
      }}
    />
  );
}
