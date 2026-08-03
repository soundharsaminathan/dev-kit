import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState, SuccessState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";

export function StudioPaymentsFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [savedSecret, setSavedSecret] = useState(false);

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const configured = Boolean(studioQuery.data?.settings?.razorpayConfigured);

  useEffect(() => {
    if (!savedSecret) return;
    const id = window.setTimeout(() => setSavedSecret(false), 4000);
    return () => window.clearTimeout(id);
  }, [savedSecret]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      const settings = studioQuery.data?.settings;
      const nextSecret = razorpayKeySecret.trim();
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
      if (nextSecret) {
        payload.razorpayKeySecret = nextSecret;
      }
      await api.patch(`/studios/${studioId}/settings`, payload);
      return { secretUpdated: Boolean(nextSecret) };
    },
    onSuccess: (result) => {
      setRazorpayKeySecret("");
      if (result.secretUpdated) {
        setSavedSecret(true);
      }
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
    },
  });

  const secretPlaceholder = configured
    ? "•••••••••••• (saved — enter a new secret to replace)"
    : "Paste Razorpay key secret";

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
              {configured
                ? "Studio keys are saved. The secret stays hidden after save."
                : "Add both key ID and secret to enable live checkout (otherwise demo mode)."}
            </p>
            {savedSecret ? (
              <SuccessState
                title="Secret saved"
                description="Stored securely. The field stays empty on purpose — it is never shown again."
              />
            ) : null}
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
              onChange={(value) => {
                setSavedSecret(false);
                setRazorpayKeySecret(value);
              }}
              placeholder={secretPlaceholder}
              autoComplete="new-password"
            />
            <p className={staff.panelDesc}>
              {configured && !razorpayKeySecret
                ? "A secret is already on file. Leave blank to keep it, or paste a new one to replace."
                : "For security, the secret is never filled back into this field after save."}
            </p>
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
