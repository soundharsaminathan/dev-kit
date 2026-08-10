import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { StudioPaymentsFields } from "@/modules/admin/studio-payments-fields";
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
  const { toast } = useToastContext("StudioPaymentsFormPage");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const configured = Boolean(studioQuery.data?.settings?.razorpayConfigured);
  const savedKeyId = studioQuery.data?.settings?.razorpayKeyId?.trim() ?? "";

  useEffect(() => {
    if (!studioQuery.data) return;
    setGstNumber(studioQuery.data.settings?.gstNumber ?? "");
  }, [studioQuery.data]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      const settings = studioQuery.data?.settings;
      const nextKeyId = razorpayKeyId.trim() || savedKeyId;
      const nextSecret = razorpayKeySecret.trim();
      const payload: {
        graceDays: number;
        expireAlertDays: number;
        razorpayKeyId?: string;
        razorpayKeySecret?: string;
        gstNumber: string | null;
      } = {
        graceDays: settings?.graceDays ?? 3,
        expireAlertDays: settings?.expireAlertDays ?? 7,
        gstNumber: gstNumber.trim() || null,
      };
      if (nextKeyId) {
        payload.razorpayKeyId = nextKeyId;
      }
      if (nextSecret) {
        payload.razorpayKeySecret = nextSecret;
      }
      if (nextSecret && !nextKeyId) {
        throw new Error("Enter the Razorpay key ID together with the secret.");
      }
      await api.patch(`/studios/${studioId}/settings`, payload);
      return { secretUpdated: Boolean(nextSecret) };
    },
    onSuccess: (result) => {
      setRazorpayKeySecret("");
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["studio-public", studioId],
      });
      toast({
        title: "Payments saved",
        description: result.secretUpdated
          ? "Razorpay secret updated securely."
          : "Payment settings updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save payments",
        description:
          error instanceof Error
            ? error.message
            : "Could not save payment settings.",
        variant: "error",
      });
    },
  });

  return (
    <>
      <Screen
        title="Payments"
        subtitle="Configure GST and Razorpay for student checkout."
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
            <StudioPaymentsFields
              titleClassName={staff.panelTitle}
              descClassName={staff.panelDesc}
              razorpayKeyId={razorpayKeyId}
              razorpayKeySecret={razorpayKeySecret}
              savedKeyId={savedKeyId}
              configured={configured}
              onKeyIdChange={setRazorpayKeyId}
              onKeySecretChange={setRazorpayKeySecret}
              gstNumber={gstNumber}
              onGstNumberChange={setGstNumber}
            />
            {configured && !razorpayKeySecret ? (
              <p className={staff.panelDesc}>
                Key ID and secret must be a matching pair from the same Razorpay
                mode (test or live).
              </p>
            ) : null}
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
