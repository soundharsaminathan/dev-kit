import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";

export function StudioProfileFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const updateStudio = useMutation({
    mutationFn: () =>
      api.patch(`/studios/${studioId}`, {
        name: name || studioQuery.data?.name,
        address: address || studioQuery.data?.address,
        contact: contact || studioQuery.data?.contact,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
    },
  });

  return (
    <>
      <Screen
        title="Studio profile"
        subtitle="Name, address, and contact details."
        showBack
        backTo="/app/settings"
        paddedCta
      >
        {studioQuery.isLoading ? (
          <SkeletonBlock height="12rem" radius="var(--radius-2xl)" />
        ) : null}

        {studioQuery.isError ? (
          <ErrorState
            description={
              studioQuery.error instanceof Error
                ? studioQuery.error.message
                : "Unable to load studio profile."
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
        ) : null}

        {studioQuery.isFetched && !studioQuery.data ? (
          <EmptyState
            title="Studio not found"
            description="Unable to load studio profile."
          />
        ) : null}

        {studioQuery.data ? (
          <div className={staff.softPanel}>
            <p className={staff.panelTitle}>Profile</p>
            <p className={staff.panelDesc}>{studioQuery.data.name}</p>
            <FormInput
              label="Name"
              value={name || studioQuery.data.name}
              onChange={setName}
            />
            <FormInput
              label="Address"
              value={address || studioQuery.data.address}
              onChange={setAddress}
            />
            <FormInput
              label="Contact"
              value={contact || studioQuery.data.contact}
              onChange={setContact}
            />
            {updateStudio.isError ? (
              <ErrorState
                description={
                  updateStudio.error instanceof Error
                    ? updateStudio.error.message
                    : "Could not save profile."
                }
              />
            ) : null}
          </div>
        ) : null}
      </Screen>

      {studioQuery.data ? (
        <StickyCtaBar>
          <TouchButton
            variant="primary"
            fullWidth
            isPending={updateStudio.isPending}
            onClick={() => updateStudio.mutate()}
          >
            Save profile
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </>
  );
}
