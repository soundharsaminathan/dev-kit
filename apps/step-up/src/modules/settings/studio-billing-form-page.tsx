import { Input } from "@dev-ui/components/input";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
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

type BillingValues = {
  graceDays: string;
  expireAlertDays: string;
  timezone: string;
  admissionFee: string;
};

export function StudioBillingFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioBillingFormPage");
  const isOwner = user?.role === "OWNER";
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
    const settings = studioQuery.data.settings;
    hydrate({
      graceDays: String(settings?.graceDays ?? 3),
      expireAlertDays: String(settings?.expireAlertDays ?? 7),
      timezone: settings?.timezone || DEFAULT_STUDIO_TIMEZONE,
      admissionFee: String(settings?.admissionFee ?? 0),
    });
  }, [studioQuery.data, hydrated, hydrate]);

  const updateSettings = useMutation({
    mutationFn: () => {
      const nextTimezone = values.timezone.trim();
      if (isOwner && !isValidIanaTimeZone(nextTimezone)) {
        throw new Error(
          "Enter a valid IANA timezone (e.g. Asia/Kolkata for Chennai).",
        );
      }
      const payload: {
        graceDays?: number;
        expireAlertDays: number;
        timezone?: string;
        admissionFee?: number;
      } = {
        expireAlertDays: Number(values.expireAlertDays),
      };
      if (isOwner) {
        payload.graceDays = Number(values.graceDays);
        payload.timezone = nextTimezone;
        payload.admissionFee = Number(values.admissionFee);
      }
      return api.patch(`/studios/${studioId}/settings`, payload);
    },
    onSuccess: () => {
      markSaved();
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
    <>
      <SettingsSection
        title="Membership"
        description="Controls how dues and expiry alerts behave."
      >
        {isOwner ? (
          <SettingsField
            label="Due days"
            description="Grace period after a membership payment is due."
          >
            <Input
              type="number"
              value={values.graceDays}
              onChange={(event) => setField("graceDays", event.target.value)}
            />
          </SettingsField>
        ) : null}
        <SettingsField
          label="Expire alert days"
          description="How many days before expiry to notify members."
        >
          <Input
            type="number"
            value={values.expireAlertDays}
            onChange={(event) =>
              setField("expireAlertDays", event.target.value)
            }
          />
        </SettingsField>
        {isOwner ? (
          <SettingsField
            label="Admission fee"
            description="One-time fee on a student's first enrollment. Set to 0 to disable."
          >
            <Input
              type="number"
              value={values.admissionFee}
              onChange={(event) => setField("admissionFee", event.target.value)}
            />
          </SettingsField>
        ) : null}
      </SettingsSection>

      {isOwner ? (
        <SettingsSection
          title="Timezone"
          description="Used when importing Excel dates and times as local wall clock."
        >
          <SettingsField
            label="Studio timezone"
            description={`Default is Chennai (Asia/Kolkata). Common values: ${TIMEZONE_OPTIONS.join(", ")}.`}
          >
            <Input
              value={values.timezone}
              onChange={(event) => setField("timezone", event.target.value)}
              placeholder={DEFAULT_STUDIO_TIMEZONE}
            />
          </SettingsField>
        </SettingsSection>
      ) : null}

      <SettingsSection title="Platform" description="Set by classa admin.">
        <SettingsField
          label="Platform fee percent"
          description="Contact support to change it."
        >
          <Input
            type="number"
            value={String(studioQuery.data.settings?.platformFeePercent ?? 5)}
            onChange={() => undefined}
            disabled
            readOnly
          />
        </SettingsField>
      </SettingsSection>

      {updateSettings.isError ? (
        <ErrorState
          description={
            updateSettings.error instanceof Error
              ? updateSettings.error.message
              : "Could not save billing settings."
          }
        />
      ) : null}

      <SettingsSaveBar
        isDirty={isDirty}
        isPending={updateSettings.isPending}
        onCancel={reset}
        onSave={() => updateSettings.mutate()}
      />
    </>
  );
}
