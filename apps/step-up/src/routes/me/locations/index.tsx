import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { LocationCard } from "@/modules/locations/location-card";
import type { StudioBranch } from "@/modules/locations/types";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./locations.module.scss";

export const Route = createFileRoute("/me/locations/")({
  component: StudentLocationsPage,
});

function StudentLocationsPage() {
  const api = useApi();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["branches", STUDIO_ID, "me"],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${STUDIO_ID}/branches`),
  });

  return (
    <Screen
      title="Locations"
      subtitle="Explore studios, facilities, and class schedules."
      wide
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={styles.root}>
          {query.isLoading ? <SkeletonCardList count={3} /> : null}
          {query.isError ? (
            <ErrorState
              description={
                query.error instanceof Error
                  ? query.error.message
                  : "Could not load locations."
              }
              action={
                <TouchButton variant="primary" onClick={() => query.refetch()}>
                  Try again
                </TouchButton>
              }
            />
          ) : null}
          {query.data && query.data.length === 0 ? (
            <EmptyState
              title="No locations yet"
              description="Your studio has not published branch pages."
            />
          ) : null}
          {query.data && query.data.length > 0 ? (
            <div className={styles.list}>
              {query.data.map((branch) => (
                <LocationCard
                  key={branch.id}
                  branch={branch}
                  detailTo="/me/locations/$id"
                  layoutId={`branch-cover-${branch.id}`}
                  footer={
                    <TouchButton
                      size="md"
                      variant="primary"
                      onClick={() =>
                        void navigate({
                          to: "/me/book",
                          search: { branchId: branch.id },
                        })
                      }
                    >
                      Book a class
                    </TouchButton>
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
