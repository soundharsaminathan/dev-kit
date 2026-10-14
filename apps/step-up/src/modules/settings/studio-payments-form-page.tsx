import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { StudioPaymentsFields } from "@/modules/admin/studio-payments-fields";
import paymentsStyles from "@/modules/admin/studio-payments-fields.module.scss";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";
import { SettingsSaveBar, SettingsSection, useSettingsDirtyForm } from "./ui";
import styles from "./ui/settings-ui.module.scss";

type PaymentsValues = {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  gstNumber: string;
  gstPercent: string;
};

export function StudioPaymentsFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioPaymentsFormPage");
  const { hydrate, hydrated, values, setField, isDirty, reset, markSaved } =
    useSettingsDirtyForm<PaymentsValues>({
      razorpayKeyId: "",
      razorpayKeySecret: "",
      gstNumber: "",
      gstPercent: "0",
    });

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const configured = Boolean(studioQuery.data?.settings?.razorpayConfigured);
  const savedKeyId = studioQuery.data?.settings?.razorpayKeyId?.trim() ?? "";

  useEffect(() => {
    if (!studioQuery.data || hydrated) return;
    hydrate({
      razorpayKeyId: "",
      razorpayKeySecret: "",
      gstNumber: studioQuery.data.settings?.gstNumber ?? "",
      gstPercent: String(studioQuery.data.settings?.gstPercent ?? 0),
    });
  }, [studioQuery.data, hydrated, hydrate]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      const settings = studioQuery.data?.settings;
      const nextKeyId = values.razorpayKeyId.trim() || savedKeyId;
      const nextSecret = values.razorpayKeySecret.trim();
      const gst = Number(values.gstPercent);
      if (!Number.isFinite(gst) || gst < 0 || gst > 100) {
        throw new Error("GST percent must be between 0 and 100.");
      }
      const payload: {
        graceDays: number;
        expireAlertDays: number;
        razorpayKeyId?: string;
        razorpayKeySecret?: string;
        gstNumber: string | null;
        gstPercent: number;
      } = {
        graceDays: settings?.graceDays ?? 3,
        expireAlertDays: settings?.expireAlertDays ?? 7,
        gstNumber: values.gstNumber.trim() || null,
        gstPercent: gst,
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
      markSaved({
        ...values,
        razorpayKeyId: "",
        razorpayKeySecret: "",
      });
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

  if (studioQuery.isLoading) {
    return <SkeletonBlock height="12rem" radius="var(--radius-xl)" />;
  }

  if (studioQuery.isError) {
    return (
      <ErrorState
        description={
          studioQuery.error instanceof Error
            ? studioQuery.error.message
            : "Unable to load payment settings."
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
        description="Unable to load payment settings."
      />
    );
  }

  return (
    <>
      <SettingsSection
        title="Checkout"
        description="GST and Razorpay credentials for online payments."
      >
        <StudioPaymentsFields
          className={paymentsStyles.fields}
          titleClassName={styles.fieldLabel}
          descClassName={styles.fieldDescription}
          razorpayKeyId={values.razorpayKeyId}
          razorpayKeySecret={values.razorpayKeySecret}
          savedKeyId={savedKeyId}
          configured={configured}
          onKeyIdChange={(value) => setField("razorpayKeyId", value)}
          onKeySecretChange={(value) => setField("razorpayKeySecret", value)}
          gstNumber={values.gstNumber}
          onGstNumberChange={(value) => setField("gstNumber", value)}
          gstPercent={values.gstPercent}
          onGstPercentChange={(value) => setField("gstPercent", value)}
        />
        {configured && !values.razorpayKeySecret ? (
          <p className={styles.fieldDescription}>
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
      </SettingsSection>

      <SettingsSaveBar
        isDirty={isDirty}
        isPending={updateSettings.isPending}
        onCancel={reset}
        onSave={() => updateSettings.mutate()}
      />
    </>
  );
}
