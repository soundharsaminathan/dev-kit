import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { useStudioId } from "@/lib/use-studio-id";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  type BillingValues,
  billingFieldErrors,
  buildBillingPayload,
  hasBillingErrors,
  isValidIanaTimeZone,
  valuesFromSettings,
} from "./studio-billing-model";
import { StudioBillingWorkspace } from "./studio-billing-workspace";
import type { Studio } from "./types";
import { useSettingsDirtyForm, useSettingsHeader } from "./ui";

export function StudioBillingFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioBillingFormPage");
  const isOwner = user?.role === "OWNER";
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState(false);
  const { hydrate, hydrated, values, setField, isDirty, reset, markSaved } =
    useSettingsDirtyForm<BillingValues>({
      graceDays: "",
      expireAlertDays: "",
      timezone: "",
      admissionFee: "",
    });

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  useEffect(() => {
    if (!studioQuery.data || hydrated) return;
    hydrate(valuesFromSettings(studioQuery.data.settings));
  }, [studioQuery.data, hydrated, hydrate]);

  useEffect(() => {
    if (isDirty) setSaved(false);
  }, [isDirty]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const errors = useMemo(
    () => billingFieldErrors(values, { isOwner }),
    [values, isOwner],
  );

  const updateSettings = useMutation({
    mutationFn: () => {
      if (isOwner && !isValidIanaTimeZone(values.timezone)) {
        throw new Error("Choose a valid studio timezone.");
      }
      return api.patch(
        `/studios/${studioId}/settings`,
        buildBillingPayload(values, isOwner),
      );
    },
    onSuccess: () => {
      markSaved();
      setShowErrors(false);
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
      toast({
        title: "Billing saved",
        description: "Billing settings updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save billing",
        description:
          error instanceof Error
            ? error.message
            : "Could not save billing settings.",
        variant: "error",
      });
    },
  });

  const onSave = useCallback(() => {
    if (hasBillingErrors(errors)) {
      setShowErrors(true);
      return;
    }
    updateSettings.mutate();
  }, [errors, updateSettings]);

  const onDiscard = useCallback(() => {
    reset();
    setShowErrors(false);
  }, [reset]);

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    withResolver: true,
    enableBeforeUnload: isDirty,
  });

  useSettingsHeader({
    dirty: isDirty,
    pending: updateSettings.isPending,
    saved,
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
            : "Unable to load billing settings."
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
        description="Unable to load billing settings."
      />
    );
  }

  return (
    <StudioBillingWorkspace
      values={values}
      setField={setField}
      platformFeePercent={studioQuery.data.settings?.platformFeePercent ?? 5}
      isOwner={isOwner}
      isDirty={isDirty}
      isPending={updateSettings.isPending}
      showErrors={showErrors}
      errors={errors}
      saveError={
        updateSettings.isError
          ? updateSettings.error instanceof Error
            ? updateSettings.error.message
            : "Could not save billing settings."
          : null
      }
      onSave={onSave}
      onDiscard={onDiscard}
      leaveOpen={blocker.status === "blocked"}
      onStay={() => blocker.reset?.()}
      onLeaveWithoutSaving={() => {
        onDiscard();
        blocker.proceed?.();
      }}
    />
  );
}
