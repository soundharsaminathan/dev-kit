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

export function StudioPaymentsFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");

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
        platformFeePercent: number;
        razorpayKeyId?: string;
        razorpayKeySecret?: string;
      } = {
        graceDays: settings?.graceDays ?? 3,
        expireAlertDays: settings?.expireAlertDays ?? 7,
        platformFeePercent: settings?.platformFeePercent ?? 5,
      };
      if (razorpayKeyId.trim()) {
        payload.razorpayKeyId = razorpayKeyId.trim();
      }
      if (razorpayKeySecret.trim()) {
        payload.razorpayKeySecret = razorpayKeySecret.trim();
      }
      return api.patch(`/studios/${studioId}/settings`, payload);
    },
    onSuccess: () => {
      setRazorpayKeySecret("");
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
    },
  });

  return (
    <>
      <Screen
        title="Payments"
        subtitle="Configure Razorpay for student checkout."
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
                : "Unable to load payment settings."
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
            description="Unable to load payment settings."
          />
        ) : null}

        {studioQuery.data ? (
          <div className={staff.softPanel}>
            <p className={staff.panelTitle}>Razorpay</p>
            <p className={staff.panelDesc}>
              {studioQuery.data.settings?.razorpayConfigured
                ? "Using studio Razorpay keys"
                : "Using env keys or demo checkout when unset"}
            </p>
            <FormInput
              label="Razorpay key ID"
              value={
                razorpayKeyId || studioQuery.data.settings?.razorpayKeyId || ""
              }
              onChange={setRazorpayKeyId}
              placeholder="rzp_live_…"
              autoComplete="off"
            />
            <FormInput
              label="Razorpay key secret"
              type="password"
              value={razorpayKeySecret}
              onChange={setRazorpayKeySecret}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
            {updateSettings.isError ? (
              <ErrorState
                description={
                  updateSettings.error instanceof Error
                    ? updateSettings.error.message
                    : "Could not save payment settings."
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
            Save payments
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </>
  );
}
