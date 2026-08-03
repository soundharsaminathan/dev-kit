import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/constants";
import { useStudioId } from "@/lib/use-studio-id";
import { BranchMap } from "@/modules/locations/branch-map";
import { LocationCard } from "@/modules/locations/location-card";
import type { MapCoordinates, StudioBranch } from "@/modules/locations/types";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./locations.module.scss";

export const Route = createFileRoute("/app/locations/")({
  component: LocationsPage,
});

type CreateForm = {
  name: string;
  address: string;
  coordinates: MapCoordinates | null;
};

const emptyForm: CreateForm = {
  name: "",
  address: "",
  coordinates: null,
};

function LocationsPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("LocationsPage");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const canManage = isAdminRole(user?.role);

  const branchesQuery = useQuery({
    queryKey: ["branches", studioId],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${studioId}/branches`),
  });

  const createBranch = useMutation({
    mutationFn: () =>
      api.post<StudioBranch>("/branches", {
        studioId,
        name: form.name.trim(),
        address: form.address.trim(),
        latitude: form.coordinates?.latitude ?? null,
        longitude: form.coordinates?.longitude ?? null,
      }),
    onSuccess: async (branch) => {
      setForm(emptyForm);
      setFormOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ["branches", studioId],
      });
      toast({
        title: "Location created",
        description: "Continue editing details and gallery.",
        variant: "success",
      });
      void navigate({
        to: "/app/locations/$id/edit",
        params: { id: branch.id },
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t create location",
        description:
          error instanceof Error
            ? error.message
            : "The location could not be created.",
        variant: "error",
      });
    },
  });

  const deleteBranch = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["branches", studioId],
      });
      toast({
        title: "Location deleted",
        description: "The branch was removed.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t delete location",
        description:
          error instanceof Error
            ? error.message
            : "This location could not be deleted.",
        variant: "error",
      });
    },
  });

  const canSave =
    Boolean(form.name.trim() && form.address.trim() && form.coordinates) &&
    !createBranch.isPending;

  return (
    <Screen
      title="Locations"
      subtitle="Studio branches with galleries, schedules, and booking pages."
      actions={
        canManage ? (
          <TouchButton
            variant="primary"
            size="md"
            onClick={() => {
              setForm(emptyForm);
              setFormOpen(true);
            }}
          >
            Add
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
                  <TouchButton
                    variant="primary"
                    onClick={() => setFormOpen(true)}
                  >
                    Add location
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
                            variant="quiet"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete “${branch.name}”? Batches using this location must be moved first.`,
                                )
                              ) {
                                deleteBranch.mutate(branch.id);
                              }
                            }}
                            isPending={
                              deleteBranch.isPending &&
                              deleteBranch.variables === branch.id
                            }
                          >
                            Delete
                          </TouchButton>
                          {deleteBranch.isError &&
                          deleteBranch.variables === branch.id ? (
                            <p className={styles.error}>
                              {deleteBranch.error instanceof Error
                                ? deleteBranch.error.message
                                : "This location could not be deleted."}
                            </p>
                          ) : null}
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

      <AppBottomSheet
        isOpen={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setForm(emptyForm);
        }}
        title="New location"
      >
        <div className={styles.form}>
          <FormInput
            label="Name"
            placeholder="Main studio"
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
          />
          <FormInput
            label="Address"
            placeholder="Street, city"
            value={form.address}
            onChange={(address) =>
              setForm((current) => ({ ...current, address }))
            }
          />
          <div className={styles.mapWrap}>
            <BranchMap
              value={form.coordinates}
              onChange={(coordinates) =>
                setForm((current) => ({ ...current, coordinates }))
              }
            />
          </div>
          {!form.coordinates ? (
            <p className={styles.help}>
              A map pin is required before saving this location.
            </p>
          ) : null}
          {createBranch.isError ? (
            <p className={styles.error}>
              {createBranch.error instanceof Error
                ? createBranch.error.message
                : "The location could not be created."}
            </p>
          ) : null}
          <TouchButton
            variant="primary"
            fullWidth
            onClick={() => createBranch.mutate()}
            isPending={createBranch.isPending}
            isDisabled={!canSave}
          >
            Create location
          </TouchButton>
        </div>
      </AppBottomSheet>
    </Screen>
  );
}
