import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import {
  LocationDetail,
  LocationDetailSkeleton,
} from "@/modules/locations/location-detail";
import { type BranchLanding, mapsUrl } from "@/modules/locations/types";
import { Screen } from "@/modules/ui/screen";
import { ErrorState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/me/locations/$id")({
  component: StudentLocationDetailPage,
});

function StudentLocationDetailPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["branch-landing", id, "me"],
    queryFn: () => api.get<BranchLanding>(`/branches/${id}/landing`),
  });

  const hasCoords =
    query.data?.latitude != null && query.data?.longitude != null;

  return (
    <Screen
      title={query.data?.name ?? "Location"}
      subtitle="Studio details"
      showBack
      backTo="/me/locations"
      wide
      paddedCta
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
          batchLinkTo={(batchId) => `/me/batches/${batchId}`}
          trainerLinkTo={(trainerId) => `/trainers/${trainerId}`}
          classesViewAllTo={`/me/locations/${id}/classes`}
          stickyCta={
            <StickyCtaBar
              secondary={
                hasCoords ? (
                  <TouchButton
                    variant="default"
                    fullWidth
                    onClick={() => {
                      window.open(
                        mapsUrl(query.data!.latitude!, query.data!.longitude!),
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    Directions
                  </TouchButton>
                ) : undefined
              }
            >
              <TouchButton
                variant="primary"
                fullWidth
                onClick={() =>
                  void navigate({
                    to: "/me/book",
                    search: { branchId: id },
                  })
                }
              >
                Book a Class
              </TouchButton>
            </StickyCtaBar>
          }
        />
      ) : null}
    </Screen>
  );
}
