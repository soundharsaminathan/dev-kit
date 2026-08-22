import { Input } from "@dev-ui/components/input";
import { TextArea } from "@dev-ui/components/text-area";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";
import {
  SettingsField,
  SettingsSaveBar,
  SettingsSection,
  useSettingsDirtyForm,
} from "./ui";

type ProfileValues = {
  name: string;
  address: string;
  contact: string;
};

export function StudioProfileFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioProfileFormPage");
  const form = useSettingsDirtyForm<ProfileValues>({
    name: "",
    address: "",
    contact: "",
  });
  const { hydrate, hydrated, values, setField, isDirty, reset, markSaved } =
    form;

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  useEffect(() => {
    if (!studioQuery.data || hydrated) return;
    hydrate({
      name: studioQuery.data.name,
      address: studioQuery.data.address,
      contact: studioQuery.data.contact,
    });
  }, [studioQuery.data, hydrated, hydrate]);

  const updateStudio = useMutation({
    mutationFn: () =>
      api.patch(`/studios/${studioId}`, {
        name: values.name.trim(),
        address: values.address.trim(),
        contact: values.contact.trim(),
      }),
    onSuccess: () => {
      markSaved();
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
      toast({
        title: "Profile saved",
        description: "Studio profile updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save profile",
        description:
          error instanceof Error ? error.message : "Could not save profile.",
        variant: "error",
      });
    },
  });

  if (studioQuery.isLoading) {
    return <SkeletonBlock height="12rem" radius="var(--radius-xl)" />;
  }

  if (studioQuery.isError) {
    return (
      <ErrorState
        description={
          studioQuery.error instanceof Error
            ? studioQuery.error.message
            : "Unable to load studio profile."
        }
        action={
          <TouchButton variant="primary" onClick={() => studioQuery.refetch()}>
            Try again
          </TouchButton>
        }
      />
    );
  }

  if (!studioQuery.data) {
    return (
      <EmptyState
        title="Studio not found"
        description="Unable to load studio profile."
      />
    );
  }

  return (
    <>
      <SettingsSection
        title="General"
        description="Your studio's display name appears across Step Up."
      >
        <SettingsField
          label="Studio name"
          description="The name displayed to students and staff."
        >
          <Input
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            autoComplete="organization"
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="Contact"
        description="How students and staff reach the studio."
      >
        <SettingsField
          label="Phone number"
          description="Used for studio communication."
        >
          <Input
            value={values.contact}
            onChange={(event) => setField("contact", event.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="Address"
        description="Your primary studio address."
      >
        <SettingsField
          label="Studio address"
          description="Shown on public and staff surfaces."
        >
          <TextArea
            value={values.address}
            onChange={(event) => setField("address", event.target.value)}
            rows={3}
            autoComplete="street-address"
          />
        </SettingsField>
      </SettingsSection>

      {updateStudio.isError ? (
        <ErrorState
          description={
            updateStudio.error instanceof Error
              ? updateStudio.error.message
              : "Could not save profile."
          }
        />
      ) : null}

      <SettingsSaveBar
        isDirty={isDirty}
        isPending={updateStudio.isPending}
        onCancel={reset}
        onSave={() => updateStudio.mutate()}
      />
    </>
  );
}
