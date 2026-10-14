import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/constants";
import {
  LocationDetail,
  LocationDetailSkeleton,
} from "@/modules/locations/location-detail";
import type { BranchLanding } from "@/modules/locations/types";
import { Screen } from "@/modules/ui/screen";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/app/locations/$id")({
  component: StaffLocationDetailPage,
});

function StaffLocationDetailPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = isAdminRole(user?.role);

  const query = useQuery({
    queryKey: ["branch-landing", id],
    queryFn: () => api.get<BranchLanding>(`/branches/${id}/landing`),
  });

  return (
    <Screen
      title={query.data?.name ?? "Location"}
      subtitle="Branch landing page"
      showBack
      backTo="/app/locations"
      wide
    >
      {query.isLoading ? <LocationDetailSkeleton /> : null}
      {query.isError ? (
        <ErrorState
          description={
            query.error instanceof Error
              ? query.error.message
              : "Could not load this location."
          }
          action={
            <TouchButton variant="primary" onClick={() => query.refetch()}>
              Try again
            </TouchButton>
          }
        />
      ) : null}
      {query.data ? (
        <LocationDetail
          landing={query.data}
          layoutId={`branch-cover-${id}`}
          batchLinkTo={(batchId) => `/app/batches/${batchId}`}
          trainerLinkTo={(trainerId) => `/trainers/${trainerId}`}
          classesViewAllTo={`/app/locations/${id}/classes`}
          actions={
            <>
              {canManage ? (
                <TouchButton
                  variant="primary"
                  onClick={() =>
                    void navigate({
                      to: "/app/locations/$id/edit",
                      params: { id },
                    })
                  }
                >
                  Edit
                </TouchButton>
              ) : null}
              <TouchButton
                variant="default"
                onClick={() =>
                  void navigate({
                    to: "/app/calendar",
                    search: {
                      branchId: id,
                      view: "week",
                      focus: new Date().toISOString(),
                    },
                  })
                }
              >
                Calendar
              </TouchButton>
            </>
          }
        />
      ) : null}
    </Screen>
  );
}
