import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { effectiveDanceStyles } from "@/lib/dance-styles";
import { useStudioId } from "@/lib/use-studio-id";
import type { MapCoordinates, StudioBranch } from "@/modules/locations/types";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  EMPTY_PROFILE_VALUES,
  emptyToNull,
  type ProfileValues,
  studioProfileCompletion,
} from "./studio-profile-model";
import { StudioProfileWorkspace } from "./studio-profile-workspace";
import type { Studio } from "./types";
import { useSettingsDirtyForm, useSettingsHeader } from "./ui";

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

function coordsFromBranch(branch: StudioBranch | null): MapCoordinates | null {
  if (branch?.latitude == null || branch.longitude == null) return null;
  return { latitude: branch.latitude, longitude: branch.longitude };
}

export function StudioProfileFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioProfileFormPage");
  const form = useSettingsDirtyForm<ProfileValues>(EMPTY_PROFILE_VALUES);
  const { hydrate, hydrated, values, setField, isDirty, reset, markSaved } =
    form;
  const [coordinates, setCoordinates] = useState<MapCoordinates | null>(null);
  const coordsBaseline = useRef<MapCoordinates | null>(null);
  const coordsHydrated = useRef(false);

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", studioId],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${studioId}/branches`),
  });

  const primaryBranchId = branchesQuery.data?.[0]?.id;
  const branchQuery = useQuery({
    queryKey: ["branch", primaryBranchId],
    enabled: Boolean(primaryBranchId),
    queryFn: () =>
      api.get<StudioBranch>(
        `/branches/${primaryBranchId}?includeArchived=false`,
      ),
  });

  const branch = branchQuery.data ?? branchesQuery.data?.[0] ?? null;

  useEffect(() => {
    if (!studioQuery.data || hydrated) return;
    hydrate(studioToValues(studioQuery.data));
  }, [studioQuery.data, hydrated, hydrate]);

  useEffect(() => {
    if (!branch || coordsHydrated.current) return;
    const next = coordsFromBranch(branch);
    setCoordinates(next);
    coordsBaseline.current = next;
    coordsHydrated.current = true;
  }, [branch]);

  const coordsDirty =
    JSON.stringify(coordinates) !== JSON.stringify(coordsBaseline.current);
  const dirty = isDirty || coordsDirty;

  const completion = useMemo(
    () =>
      studioProfileCompletion({
        values,
        hasLogo: Boolean(studioQuery.data?.logoUrl),
        danceStyleCount: effectiveDanceStyles(
          studioQuery.data?.settings?.danceStyles,
        ).length,
        galleryCount:
          (studioQuery.data?.photos?.length ?? 0) +
          (branch?.media?.filter((item) => !item.archivedAt).length ?? 0),
        faqCount: branch?.faqs?.length ?? 0,
        testimonialCount: branch?.testimonials?.length ?? 0,
      }),
    [values, studioQuery.data, branch],
  );

  const updateStudio = useMutation({
    mutationFn: async () => {
      const year = emptyToNull(values.foundedYear);
      await api.patch(`/studios/${studioId}`, {
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
      if (branch && coordsDirty) {
        await api.patch(`/branches/${branch.id}`, {
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
        });
      }
    },
    onSuccess: () => {
      markSaved();
      coordsBaseline.current = coordinates;
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["discover-studio", studioId],
      });
      void queryClient.invalidateQueries({ queryKey: ["branches", studioId] });
      if (branch) {
        void queryClient.invalidateQueries({ queryKey: ["branch", branch.id] });
      }
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

  const onSave = useCallback(() => {
    updateStudio.mutate();
  }, [updateStudio]);

  const onDiscard = useCallback(() => {
    reset();
    setCoordinates(coordsBaseline.current);
  }, [reset]);

  useSettingsHeader({
    dirty,
    pending: updateStudio.isPending,
    onSave,
    onDiscard,
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
    <StudioProfileWorkspace
      studio={studioQuery.data}
      branch={branch}
      values={values}
      coordinates={coordinates}
      setField={setField}
      onCoordinatesChange={setCoordinates}
      resolveMapLink={async (url) => {
        const result = await api.post<{ url: string }>(
          "/branches/resolve-map-url",
          { url },
        );
        return result.url;
      }}
      isDirty={dirty}
      isPending={updateStudio.isPending}
      isOwner={user?.role === "OWNER"}
      saveError={
        updateStudio.isError
          ? updateStudio.error instanceof Error
            ? updateStudio.error.message
            : "Could not save profile."
          : null
      }
      onSave={onSave}
      onDiscard={onDiscard}
      completion={completion}
    />
  );
}
