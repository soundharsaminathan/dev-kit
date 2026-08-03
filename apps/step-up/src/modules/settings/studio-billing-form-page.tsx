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

export function StudioBillingFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.role === "OWNER";
  const [graceDays, setGraceDays] = useState("");
  const [expireAlertDays, setExpireAlertDays] = useState("");
  const [platformFeePercent, setPlatformFeePercent] = useState("");

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const updateSettings = useMutation({
    mutationFn: () => {
      const settings = studioQuery.data?.settings;
      const payload: {
        graceDays: number;
        expireAlertDays: number;
        platformFeePercent?: number;
      } = {
        graceDays: Number(graceDays || (settings?.graceDays ?? 3)),
        expireAlertDays: Number(
          expireAlertDays || (settings?.expireAlertDays ?? 7),
        ),
      };
      if (isOwner) {
        payload.platformFeePercent = Number(
          platformFeePercent || (settings?.platformFeePercent ?? 5),
        );
      }
      return api.patch(`/studios/${studioId}/settings`, payload);
    },
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
        title="Billing"
        subtitle="Grace period, expiry alerts, and platform fee."
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
              Grace period, expiry alerts, and platform fee
            </p>
            <FormInput
              label="Grace days"
              type="number"
              value={
                graceDays || String(studioQuery.data.settings?.graceDays ?? 3)
              }
              onChange={setGraceDays}
            />
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
              <FormInput
                label="Platform fee percent"
                type="number"
                value={
                  platformFeePercent ||
                  String(studioQuery.data.settings?.platformFeePercent ?? 5)
                }
                onChange={setPlatformFeePercent}
              />
            ) : null}
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
