import { Switch } from "@dev-ui/components/switch";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { useApi } from "@/lib/api-context";
import { featureCategoryIcon, featureIcon } from "@/lib/feature-icons";
import {
  applyStudioFeatureEnabled,
  applyStudioFeatureItem,
  type StudioFeatureItem,
  type StudioFeaturesResponse,
  studioFeaturesQueryKey,
} from "@/lib/studio-features";
import { Screen } from "@/modules/ui/screen";
import { SkeletonRowList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./features.module.scss";

export const Route = createFileRoute("/admin/studios/$id_/features")({
  component: AdminStudioFeaturesPage,
});

const CATEGORY_ORDER = ["Communication", "Finance", "Engagement", "Operations"];

type ToggleVariables = { key: string; enabled: boolean };
type ToggleContext = ToggleVariables & { gen: number };

function AdminStudioFeaturesPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("AdminStudioFeaturesPage");
  const queryKey = studioFeaturesQueryKey(id);
  const inFlight = useRef(0);
  const generation = useRef(new Map<string, number>());

  const featuresQuery = useQuery({
    queryKey,
    queryFn: () => api.get<StudioFeaturesResponse>(`/studios/${id}/features`),
  });

  const toggleMutation = useMutation<
    StudioFeatureItem,
    Error,
    ToggleVariables,
    ToggleContext
  >({
    mutationFn: ({ key, enabled }) =>
      api.patch<StudioFeatureItem>(`/studios/${id}/features/${key}`, {
        enabled,
      }),
    onMutate: async ({ key, enabled }) => {
      inFlight.current += 1;
      const gen = (generation.current.get(key) ?? 0) + 1;
      generation.current.set(key, gen);

      queryClient.setQueryData<StudioFeaturesResponse>(queryKey, (prev) =>
        applyStudioFeatureEnabled(prev, key, enabled),
      );
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<StudioFeaturesResponse>(queryKey, (prev) =>
        applyStudioFeatureEnabled(prev, key, enabled),
      );

      return { key, enabled, gen };
    },
    onSuccess: (updated, _variables, context) => {
      if (context && generation.current.get(context.key) !== context.gen) {
        return;
      }
      queryClient.setQueryData<StudioFeaturesResponse>(queryKey, (prev) =>
        applyStudioFeatureItem(prev, updated),
      );
    },
    onError: (error, variables, context) => {
      if (context && generation.current.get(variables.key) === context.gen) {
        queryClient.setQueryData<StudioFeaturesResponse>(queryKey, (prev) =>
          applyStudioFeatureEnabled(prev, variables.key, !variables.enabled),
        );
      }
      toast({
        title: "Couldn’t update feature",
        description:
          error instanceof Error ? error.message : "Could not update feature.",
        variant: "error",
      });
    },
    onSettled: () => {
      inFlight.current = Math.max(0, inFlight.current - 1);
      if (inFlight.current === 0) {
        void queryClient.invalidateQueries({ queryKey });
      }
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

  const enabledCount = featuresQuery.data?.features.filter(
    (feature) => feature.enabled,
  ).length;
  const totalCount = featuresQuery.data?.features.length;

  return (
    <Screen
      title="Studio features"
      subtitle="Turn modules on or off for this studio. Disabled modules disappear from the app and API."
      titleEnd={
        totalCount ? (
          <span>
            {enabledCount} of {totalCount} on
          </span>
        ) : null
      }
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

      {featuresQuery.isLoading ? (
        <SkeletonRowList count={6} label="Loading studio features" />
      ) : null}

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

      <div className={styles.groups}>
        {grouped.map((group) => (
          <section key={group.category} className={staff.section}>
            <div className={styles.groupHeader}>
              <span className={styles.groupIcon} aria-hidden>
                <Icon name={featureCategoryIcon(group.category)} />
              </span>
              <h2 className={staff.sectionTitle}>{group.category}</h2>
            </div>
            <ul className={styles.card}>
              {group.features.map((feature) => (
                <li key={feature.key}>
                  <div
                    className={styles.row}
                    data-enabled={feature.enabled ? "true" : "false"}
                  >
                    <span className={styles.icon} aria-hidden>
                      <Icon name={featureIcon(feature.key)} />
                    </span>
                    <div className={styles.copy}>
                      <div className={styles.nameRow}>
                        <p className={styles.name}>{feature.name}</p>
                        <span className={styles.status}>
                          {feature.enabled ? "On" : "Off"}
                        </span>
                      </div>
                      <p className={styles.description}>
                        {feature.description}
                      </p>
                    </div>
                    <div
                      className={styles.toggle}
                      data-testid={`feature-toggle-${feature.key}`}
                    >
                      <Switch
                        isSelected={feature.enabled}
                        aria-label={`Toggle ${feature.name}`}
                        onChange={(enabled) => {
                          toggleMutation.mutate({
                            key: feature.key,
                            enabled,
                          });
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Screen>
  );
}
