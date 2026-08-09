import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/constants";
import { useStudioId } from "@/lib/use-studio-id";
import { LocationCard } from "@/modules/locations/location-card";
import type { StudioBranch } from "@/modules/locations/types";
import { AppSheet } from "@/modules/ui/app-sheet";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./locations.module.scss";

export const Route = createFileRoute("/app/locations/")({
  component: LocationsPage,
});

function LocationsPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("LocationsPage");
  const canManage = isAdminRole(user?.role);
  const [branchToDelete, setBranchToDelete] = useState<StudioBranch | null>(
    null,
  );

  const branchesQuery = useQuery({
    queryKey: ["branches", studioId],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${studioId}/branches`),
  });

  const deleteBranch = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: async () => {
      setBranchToDelete(null);
      await queryClient.invalidateQueries({
        queryKey: ["branches", studioId],
      });
      toast({
        title: "Location deleted",
        description: "The branch was removed.",
        variant: "success",
      });
    },
  });

  return (
    <Screen
      title="Locations"
      subtitle="Studio branches with galleries, schedules, and booking pages."
      actions={
        canManage ? (
          <TouchButton variant="primary" size="md">
            <Link to="/app/locations/new">Add</Link>
          </TouchButton>
        ) : undefined
      }
      wide
    >
      <PullToRefresh onRefresh={() => branchesQuery.refetch()}>
        <div className={styles.root}>
          {branchesQuery.isLoading ? <SkeletonCardList count={3} /> : null}

          {branchesQuery.isError ? (
            <ErrorState
              description={
                branchesQuery.error instanceof Error
                  ? branchesQuery.error.message
                  : "Could not load locations."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => branchesQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {branchesQuery.data && branchesQuery.data.length === 0 ? (
            <EmptyState
              title="No locations yet"
              description={
                canManage
                  ? "Add a branch so batches can use a studio location."
                  : "No studio branches are published yet."
              }
              action={
                canManage ? (
                  <TouchButton variant="primary">
                    <Link to="/app/locations/new">Add location</Link>
                  </TouchButton>
                ) : undefined
              }
            />
          ) : null}

          {branchesQuery.data && branchesQuery.data.length > 0 ? (
            <div className={styles.list}>
              {branchesQuery.data.map((branch) => (
                <LocationCard
                  key={branch.id}
                  branch={branch}
                  detailTo="/app/locations/$id"
                  layoutId={`branch-cover-${branch.id}`}
                  footer={
                    <div className={styles.cardActions}>
                      <TouchButton
                        size="sm"
                        variant="default"
                        onClick={() => {
                          void navigate({
                            to: "/app/calendar",
                            search: {
                              branchId: branch.id,
                              view: "week",
                              focus: new Date().toISOString(),
                            },
                          });
                        }}
                      >
                        Calendar
                      </TouchButton>
                      {canManage ? (
                        <>
                          <TouchButton
                            size="sm"
                            variant="quiet"
                            onClick={() => {
                              void navigate({
                                to: "/app/locations/$id/edit",
                                params: { id: branch.id },
                              });
                            }}
                          >
                            Edit
                          </TouchButton>
                          <TouchButton
                            size="sm"
                            variant="danger"
                            data-testid={`delete-location-${branch.id}`}
                            onClick={() => setBranchToDelete(branch)}
                          >
                            Delete
                          </TouchButton>
                        </>
                      ) : null}
                    </div>
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>

      <AppSheet
        isOpen={branchToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteBranch.isPending) {
            setBranchToDelete(null);
          }
        }}
        title="Delete location"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Delete “{branchToDelete?.name}”? Batches using this location must be
            moved first.
          </p>
          {deleteBranch.isError ? (
            <ErrorState
              description={
                deleteBranch.error instanceof Error
                  ? deleteBranch.error.message
                  : "This location could not be deleted."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={deleteBranch.isPending}
              onClick={() => setBranchToDelete(null)}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={deleteBranch.isPending}
              data-testid="confirm-delete-location"
              onClick={() => {
                if (!branchToDelete) return;
                deleteBranch.mutate(branchToDelete.id);
              }}
            >
              Delete location
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </Screen>
  );
}
