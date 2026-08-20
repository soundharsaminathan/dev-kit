import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { useStudioId } from "@/lib/use-studio-id";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";

/** Chennai / India Standard Time — IANA id is Asia/Kolkata (no separate Asia/Chennai). */
const DEFAULT_STUDIO_TIMEZONE = "Asia/Kolkata";

const TIMEZONE_OPTIONS = [
  DEFAULT_STUDIO_TIMEZONE,
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
] as const;

function isValidIanaTimeZone(timeZone: string): boolean {
  const trimmed = timeZone.trim();
  if (!trimmed) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function StudioBillingFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioBillingFormPage");
  const isOwner = user?.role === "OWNER";
  const [graceDays, setGraceDays] = useState("");
  const [expireAlertDays, setExpireAlertDays] = useState("");
  const [timezone, setTimezone] = useState("");

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const updateSettings = useMutation({
    mutationFn: () => {
      const settings = studioQuery.data?.settings;
      const nextTimezone = (
        timezone ||
        settings?.timezone ||
        DEFAULT_STUDIO_TIMEZONE
      ).trim();
      if (isOwner && !isValidIanaTimeZone(nextTimezone)) {
        throw new Error(
          "Enter a valid IANA timezone (e.g. Asia/Kolkata for Chennai).",
        );
      }
      const payload: {
        graceDays?: number;
        expireAlertDays: number;
        timezone?: string;
      } = {
        expireAlertDays: Number(
          expireAlertDays || (settings?.expireAlertDays ?? 7),
        ),
      };
      if (isOwner) {
        payload.graceDays = Number(graceDays || (settings?.graceDays ?? 3));
        payload.timezone = nextTimezone;
      }
      return api.patch(`/studios/${studioId}/settings`, payload);
    },
    onSuccess: () => {
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

  return (
    <>
      <Screen
        title="Billing"
        subtitle="Due days, expiry alerts, timezone, and platform fee."
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
                : "Unable to load billing settings."
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
            description="Unable to load billing settings."
          />
        ) : null}

        {studioQuery.data ? (
          <div className={staff.softPanel}>
            <p className={staff.panelTitle}>Billing settings</p>
            <p className={staff.panelDesc}>
              Due days, expiry alerts, timezone, and platform fee
            </p>
            {isOwner ? (
              <FormInput
                label="Due days"
                type="number"
                value={
                  graceDays || String(studioQuery.data.settings?.graceDays ?? 3)
                }
                onChange={setGraceDays}
              />
            ) : null}
            <FormInput
              label="Expire alert days"
              type="number"
              value={
                expireAlertDays ||
                String(studioQuery.data.settings?.expireAlertDays ?? 7)
              }
              onChange={setExpireAlertDays}
            />
            {isOwner ? (
              <>
                <FormInput
                  label="Studio timezone"
                  value={
                    timezone ||
                    studioQuery.data.settings?.timezone ||
                    DEFAULT_STUDIO_TIMEZONE
                  }
                  onChange={setTimezone}
                  placeholder={DEFAULT_STUDIO_TIMEZONE}
                />
                <p className={staff.panelDesc}>
                  Default is Chennai (Asia/Kolkata). Used when importing Excel
                  dates and times as local wall clock. Common values:{" "}
                  {TIMEZONE_OPTIONS.join(", ")}.
                </p>
              </>
            ) : null}
            <FormInput
              label="Platform fee percent"
              type="number"
              value={String(studioQuery.data.settings?.platformFeePercent ?? 5)}
              onChange={() => undefined}
              isDisabled
              readOnly
            />
            <p className={staff.panelDesc}>
              Set by Step Up admin. Contact support to change it.
            </p>
            {updateSettings.isError ? (
              <ErrorState
                description={
                  updateSettings.error instanceof Error
                    ? updateSettings.error.message
                    : "Could not save billing settings."
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
            isPending={updateSettings.isPending}
            onClick={() => updateSettings.mutate()}
          >
            Save billing
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </>
  );
}
