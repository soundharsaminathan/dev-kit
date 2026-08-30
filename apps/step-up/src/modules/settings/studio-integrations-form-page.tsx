import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import {
  type AiProviderValue,
  StudioAiFields,
} from "@/modules/admin/studio-ai-fields";
import aiStyles from "@/modules/admin/studio-ai-fields.module.scss";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";
import { SettingsSaveBar, SettingsSection, useSettingsDirtyForm } from "./ui";
import styles from "./ui/settings-ui.module.scss";

type IntegrationsValues = {
  aiProvider: AiProviderValue | "";
  aiApiKey: string;
  aiChatModel: string;
};

export function StudioIntegrationsFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioIntegrationsFormPage");
  const [removeKey, setRemoveKey] = useState(false);
  const { hydrate, hydrated, values, setField, isDirty, reset, markSaved } =
    useSettingsDirtyForm<IntegrationsValues>({
      aiProvider: "",
      aiApiKey: "",
      aiChatModel: "",
    });

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const configured = Boolean(studioQuery.data?.settings?.aiConfigured);
  const savedProvider = studioQuery.data?.settings?.aiProvider ?? null;

  useEffect(() => {
    if (!studioQuery.data || hydrated) return;
    hydrate({
      aiProvider:
        (studioQuery.data.settings?.aiProvider as AiProviderValue) ?? "",
      aiApiKey: "",
      aiChatModel: studioQuery.data.settings?.aiChatModel ?? "",
    });
    setRemoveKey(false);
  }, [studioQuery.data, hydrated, hydrate]);

  const dirty = isDirty || removeKey;

  const updateSettings = useMutation({
    mutationFn: async () => {
      const settings = studioQuery.data?.settings;
      const nextProvider =
        values.aiProvider || (savedProvider as AiProviderValue | null) || null;
      const nextKey = values.aiApiKey.trim();

      if (nextKey && !nextProvider) {
        throw new Error("Select an AI provider together with the API key.");
      }

      const payload: {
        graceDays: number;
        expireAlertDays: number;
        aiProvider?: AiProviderValue | null;
        aiApiKey?: string;
        aiChatModel?: string | null;
      } = {
        graceDays: settings?.graceDays ?? 3,
        expireAlertDays: settings?.expireAlertDays ?? 7,
        aiChatModel: values.aiChatModel.trim() || null,
      };

      if (values.aiProvider) {
        payload.aiProvider = values.aiProvider;
      }

      if (removeKey) {
        payload.aiApiKey = "";
      } else if (nextKey) {
        payload.aiApiKey = nextKey;
      }

      await api.patch(`/studios/${studioId}/settings`, payload);
      return { keyUpdated: Boolean(nextKey) || removeKey };
    },
    onSuccess: (result) => {
      setRemoveKey(false);
      markSaved({
        ...values,
        aiApiKey: "",
      });
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      toast({
        title: "Integrations saved",
        description: result.keyUpdated
          ? "AI agent credentials updated."
          : "AI agent settings updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save integrations",
        description:
          error instanceof Error
            ? error.message
            : "Could not save AI settings.",
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
            : "Unable to load integrations."
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
        description="Unable to load integrations."
      />
    );
  }

  return (
    <>
      <SettingsSection
        title="AI agent"
        description="Studio-owned provider and API key for the staff CRM agent."
      >
        <StudioAiFields
          className={aiStyles.fields}
          titleClassName={styles.fieldLabel}
          descClassName={styles.fieldDescription}
          aiProvider={values.aiProvider}
          aiApiKey={removeKey ? "" : values.aiApiKey}
          aiChatModel={values.aiChatModel}
          configured={configured && !removeKey}
          onProviderChange={(value) => setField("aiProvider", value)}
          onApiKeyChange={(value) => {
            setRemoveKey(false);
            setField("aiApiKey", value);
          }}
          onChatModelChange={(value) => setField("aiChatModel", value)}
          onRemoveKey={
            configured
              ? () => {
                  setRemoveKey(true);
                  setField("aiApiKey", "");
                }
              : undefined
          }
        />
        {updateSettings.isError ? (
          <ErrorState
            description={
              updateSettings.error instanceof Error
                ? updateSettings.error.message
                : "Could not save AI settings."
            }
          />
        ) : null}
      </SettingsSection>

      <SettingsSaveBar
        isDirty={dirty}
        isPending={updateSettings.isPending}
        onCancel={() => {
          setRemoveKey(false);
          reset();
        }}
        onSave={() => updateSettings.mutate()}
      />
    </>
  );
}
