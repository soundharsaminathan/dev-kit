import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { LocationSchedule } from "@/modules/locations/location-schedule";
import type { BranchLanding } from "@/modules/locations/types";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/me/locations/$id_/classes")({
  component: StudentLocationClassesPage,
});

function StudentLocationClassesPage() {
  const { id } = Route.useParams();
  const api = useApi();

  const query = useQuery({
    queryKey: ["branch-landing", id, "me"],
    queryFn: () => api.get<BranchLanding>(`/branches/${id}/landing`),
  });

  return (
    <Screen
      title="Classes"
      subtitle={
        query.data ? `Everything running at ${query.data.name}` : undefined
      }
      showBack
      backTo={`/me/locations/${id}`}
      wide
    >
      {query.isLoading ? <SkeletonCardList count={4} /> : null}
      {query.isError ? (
        <ErrorState
          description={
            query.error instanceof Error
              ? query.error.message
              : "Could not load classes for this location."
          }
          action={
            <TouchButton variant="primary" onClick={() => query.refetch()}>
              Try again
            </TouchButton>
          }
        />
      ) : null}
      {query.data ? (
        <LocationSchedule
          batches={query.data.batches}
          batchLinkTo={(batchId) => `/me/batches/${batchId}`}
        />
      ) : null}
    </Screen>
  );
}
