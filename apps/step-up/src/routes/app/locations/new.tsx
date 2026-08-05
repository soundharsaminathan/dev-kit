import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { BranchMap } from "@/modules/locations/branch-map";
import type { MapCoordinates, StudioBranch } from "@/modules/locations/types";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./new.module.scss";

export const Route = createFileRoute("/app/locations/new")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: NewLocationPage,
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

function NewLocationPage() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("NewLocationPage");
  const [form, setForm] = useState<CreateForm>(emptyForm);

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

  const canSave =
    Boolean(form.name.trim() && form.address.trim() && form.coordinates) &&
    !createBranch.isPending;

  return (
    <Screen
      title="New location"
      subtitle="Name, address, and map pin for a studio branch."
      showBack
      backTo="/app/locations"
      wide
    >
      <div className={styles.root}>
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
    </Screen>
  );
}
