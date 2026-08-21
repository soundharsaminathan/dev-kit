import { Switch } from "@dev-ui/components/switch";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import {
  type StudioFeatureItem,
  type StudioFeaturesResponse,
  studioFeaturesQueryKey,
} from "@/lib/studio-features";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./features.module.scss";

export const Route = createFileRoute("/admin/studios/$id_/features")({
  component: AdminStudioFeaturesPage,
});

const CATEGORY_ORDER = [
  "Communication",
  "Finance",
  "Engagement",
  "Operations",
];

function AdminStudioFeaturesPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("AdminStudioFeaturesPage");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const featuresQuery = useQuery({
    queryKey: studioFeaturesQueryKey(id),
    queryFn: () =>
      api.get<StudioFeaturesResponse>(`/studios/${id}/features`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      api.patch<StudioFeatureItem>(`/studios/${id}/features/${key}`, {
        enabled,
      }),
    onMutate: ({ key }) => {
      setPendingKey(key);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<StudioFeaturesResponse>(
        studioFeaturesQueryKey(id),
        (prev) => {
          if (!prev) {
            return { features: [updated] };
          }
          return {
            features: prev.features.map((feature) =>
              feature.key === updated.key
                ? { ...feature, ...updated }
                : feature,
            ),
          };
        },
      );
      toast({
        title: updated.enabled ? "Feature enabled" : "Feature disabled",
        description: updated.enabled
          ? `${updated.name} is now available to this studio.`
          : `${updated.name} is hidden from this studio.`,
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t update feature",
        description:
          error instanceof Error ? error.message : "Could not update feature.",
        variant: "error",
      });
    },
    onSettled: () => {
      setPendingKey(null);
      void queryClient.invalidateQueries({
        queryKey: studioFeaturesQueryKey(id),
      });
    },
  });

  const grouped = useMemo(() => {
    const features = featuresQuery.data?.features ?? [];
    const byCategory = new Map<string, StudioFeatureItem[]>();
    for (const feature of features) {
      const list = byCategory.get(feature.category) ?? [];
      list.push(feature);
      byCategory.set(feature.category, list);
    }
    const ordered = CATEGORY_ORDER.filter((category) =>
      byCategory.has(category),
    );
    for (const category of byCategory.keys()) {
      if (!ordered.includes(category)) {
        ordered.push(category);
      }
    }
    return ordered.map((category) => ({
      category,
      features: byCategory.get(category) ?? [],
    }));
  }, [featuresQuery.data?.features]);

  return (
    <Screen
      title="Studio features"
      subtitle="Enable or disable modules for this studio. Disabled modules are unavailable in the app and API."
      showBack
      backTo={`/admin/studios/${id}`}
    >
      <div className={staff.rowActions}>
        <TouchButton
          variant="default"
          size="sm"
          onClick={() =>
            void navigate({
              to: "/admin/studios/$id",
              params: { id },
            })
          }
        >
          Edit studio
        </TouchButton>
      </div>

      {featuresQuery.isLoading ? <SkeletonBlock height="12rem" /> : null}

      {featuresQuery.isError ? (
        <ErrorState
          description={
            featuresQuery.error instanceof Error
              ? featuresQuery.error.message
              : "Could not load studio features."
          }
          action={
            <TouchButton
              variant="primary"
              onClick={() => featuresQuery.refetch()}
            >
              Try again
            </TouchButton>
          }
        />
      ) : null}

      {featuresQuery.data?.features.length === 0 ? (
        <EmptyState
          title="No features"
          description="The feature catalog is empty."
        />
      ) : null}

      {grouped.map((group) => (
        <section key={group.category} className={staff.section}>
          <h2 className={staff.sectionTitle}>{group.category}</h2>
          <ul className={styles.list}>
            {group.features.map((feature) => {
              const saving = pendingKey === feature.key;
              return (
                <li key={feature.key} className={styles.row}>
                  <div className={styles.copy}>
                    <p className={styles.name}>{feature.name}</p>
                    <p className={styles.description}>{feature.description}</p>
                    <p className={styles.hint}>
                      {feature.enabled
                        ? "Available to this studio."
                        : "Hidden from this studio’s navigation and APIs."}
                    </p>
                  </div>
                  <div data-testid={`feature-toggle-${feature.key}`}>
                    <Switch
                      isSelected={feature.enabled}
                      isDisabled={saving || toggleMutation.isPending}
                      aria-label={`Toggle ${feature.name}`}
                      onChange={(enabled) => {
                        toggleMutation.mutate({ key: feature.key, enabled });
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Screen>
  );
}
