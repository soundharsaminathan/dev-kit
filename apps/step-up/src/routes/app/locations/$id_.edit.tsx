import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { LocationEditWorkspace } from "@/modules/locations/location-edit-workspace";
import type { StudioBranch } from "@/modules/locations/types";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./edit.module.scss";

export const Route = createFileRoute("/app/locations/$id_/edit")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: LocationEditPage,
});

function LocationEditPage() {
  const { id } = Route.useParams();
  const api = useApi();

  const query = useQuery({
    queryKey: ["branch", id, "edit"],
    queryFn: () =>
      api.get<StudioBranch>(`/branches/${id}?includeArchived=false`),
  });

  if (query.isLoading) {
    return (
      <Screen
        title="Edit location"
        showBack
        backTo={`/app/locations/${id}`}
        wide
      >
        <div className={styles.skeleton}>
          <div className={styles.skeletonMain}>
            <SkeletonBlock height="16rem" />
            <SkeletonBlock height="10rem" />
            <SkeletonBlock height="14rem" />
          </div>
          <div className={styles.skeletonRail}>
            <SkeletonBlock height="22rem" />
            <SkeletonBlock height="12rem" />
          </div>
        </div>
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen title="Edit location" showBack backTo="/app/locations">
        <ErrorState
          description={
            query.error instanceof Error
              ? query.error.message
              : "Could not load location."
          }
          action={
            <TouchButton variant="primary" onClick={() => query.refetch()}>
              Try again
            </TouchButton>
          }
        />
      </Screen>
    );
  }

  return <LocationEditWorkspace branch={query.data} />;
}
