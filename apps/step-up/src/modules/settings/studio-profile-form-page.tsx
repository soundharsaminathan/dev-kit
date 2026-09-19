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
  tagline: string;
  foundedYear: string;
  about: string;
  address: string;
  contact: string;
  whatsapp: string;
  email: string;
  instagramUrl: string;
  youtubeUrl: string;
  websiteUrl: string;
  trialBlurb: string;
  whatToBring: string;
};

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function studioToValues(studio: Studio): ProfileValues {
  return {
    name: studio.name ?? "",
    tagline: studio.tagline ?? "",
    foundedYear: studio.foundedYear != null ? String(studio.foundedYear) : "",
    about: studio.about ?? "",
    address: studio.address ?? "",
    contact: studio.contact ?? "",
    whatsapp: studio.whatsapp ?? "",
    email: studio.email ?? "",
    instagramUrl: studio.instagramUrl ?? "",
    youtubeUrl: studio.youtubeUrl ?? "",
    websiteUrl: studio.websiteUrl ?? "",
    trialBlurb: studio.trialBlurb ?? "",
    whatToBring: studio.whatToBring ?? "",
  };
}

export function StudioProfileFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioProfileFormPage");
  const form = useSettingsDirtyForm<ProfileValues>({
    name: "",
    tagline: "",
    foundedYear: "",
    about: "",
    address: "",
    contact: "",
    whatsapp: "",
    email: "",
    instagramUrl: "",
    youtubeUrl: "",
    websiteUrl: "",
    trialBlurb: "",
    whatToBring: "",
  });
  const { hydrate, hydrated, values, setField, isDirty, reset, markSaved } =
    form;

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  useEffect(() => {
    if (!studioQuery.data || hydrated) return;
    hydrate(studioToValues(studioQuery.data));
  }, [studioQuery.data, hydrated, hydrate]);

  const updateStudio = useMutation({
    mutationFn: () => {
      const year = emptyToNull(values.foundedYear);
      return api.patch(`/studios/${studioId}`, {
        name: values.name.trim(),
        address: values.address.trim(),
        contact: values.contact.trim(),
        tagline: emptyToNull(values.tagline),
        about: emptyToNull(values.about),
        foundedYear: year ? Number(year) : null,
        email: emptyToNull(values.email),
        whatsapp: emptyToNull(values.whatsapp),
        instagramUrl: emptyToNull(values.instagramUrl),
        youtubeUrl: emptyToNull(values.youtubeUrl),
        websiteUrl: emptyToNull(values.websiteUrl),
        trialBlurb: emptyToNull(values.trialBlurb),
        whatToBring: emptyToNull(values.whatToBring),
      });
    },
    onSuccess: () => {
      markSaved();
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["discover-studio", studioId],
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
        description="Your studio name and the short story visitors see first."
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
        <SettingsField
          label="Tagline"
          description="One line under the studio name on the public page."
        >
          <Input
            value={values.tagline}
            onChange={(event) => setField("tagline", event.target.value)}
            maxLength={80}
          />
        </SettingsField>
        <SettingsField
          label="Founded year"
          description="Shown as Since 2018 on the public page."
        >
          <Input
            value={values.foundedYear}
            onChange={(event) => setField("foundedYear", event.target.value)}
            inputMode="numeric"
            maxLength={4}
          />
        </SettingsField>
        <SettingsField
          label="About"
          description="A short note about who you teach and what the floor feels like."
        >
          <TextArea
            value={values.about}
            onChange={(event) => setField("about", event.target.value)}
            rows={4}
            maxLength={2000}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="Contact"
        description="How visitors reach the studio from the public page."
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
        <SettingsField
          label="WhatsApp"
          description="Opens a chat. Leave blank to hide the button."
        >
          <Input
            value={values.whatsapp}
            onChange={(event) => setField("whatsapp", event.target.value)}
            inputMode="tel"
          />
        </SettingsField>
        <SettingsField label="Email">
          <Input
            value={values.email}
            onChange={(event) => setField("email", event.target.value)}
            type="email"
            autoComplete="email"
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="Social"
        description="Public links. Handles like @studio are fine for Instagram."
      >
        <SettingsField label="Instagram">
          <Input
            value={values.instagramUrl}
            onChange={(event) => setField("instagramUrl", event.target.value)}
            inputMode="url"
            placeholder="@studio"
          />
        </SettingsField>
        <SettingsField label="YouTube">
          <Input
            value={values.youtubeUrl}
            onChange={(event) => setField("youtubeUrl", event.target.value)}
            inputMode="url"
          />
        </SettingsField>
        <SettingsField label="Website">
          <Input
            value={values.websiteUrl}
            onChange={(event) => setField("websiteUrl", event.target.value)}
            inputMode="url"
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="First class"
        description="Helps a parent or dancer show up ready."
      >
        <SettingsField
          label="Trial note"
          description="Shown next to Book a trial. Example: First trial is free."
        >
          <Input
            value={values.trialBlurb}
            onChange={(event) => setField("trialBlurb", event.target.value)}
            maxLength={200}
          />
        </SettingsField>
        <SettingsField
          label="What to bring"
          description="Shoes, water, or anything they should know before class."
        >
          <TextArea
            value={values.whatToBring}
            onChange={(event) => setField("whatToBring", event.target.value)}
            rows={3}
            maxLength={500}
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
