import { Switch } from "@dev-ui/components/switch";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useMemo, useRef } from "react";
import { useApi } from "@/lib/api-context";
import { featureCategoryIcon, featureIcon } from "@/lib/feature-icons";
import {
  applyStudioFeatureEnabled,
  applyStudioFeatureItem,
  type StudioFeatureItem,
  type StudioFeaturesResponse,
  studioFeaturesQueryKey,
} from "@/lib/studio-features";
import { SkeletonRowList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { SettingsToggleRow } from "./ui";
import styles from "./ui/settings-ui.module.scss";

const CATEGORY_ORDER = ["Communication", "Finance", "Engagement", "Operations"];

type ToggleVariables = { key: string; enabled: boolean };
type ToggleContext = ToggleVariables & { gen: number };

type StudioFeaturesPanelProps = {
  studioId: string;
  headerActions?: ReactNode;
  showCounts?: boolean;
};

export function StudioFeaturesPanel({
  studioId,
  headerActions,
  showCounts = true,
}: StudioFeaturesPanelProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioFeaturesPanel");
  const queryKey = studioFeaturesQueryKey(studioId);
  const inFlight = useRef(0);
  const generation = useRef(new Map<string, number>());

  const featuresQuery = useQuery({
    queryKey,
    queryFn: () =>
      api.get<StudioFeaturesResponse>(`/studios/${studioId}/features`),
  });

  const toggleMutation = useMutation<
    StudioFeatureItem,
    Error,
    ToggleVariables,
    ToggleContext
  >({
    mutationFn: ({ key, enabled }) =>
      api.patch<StudioFeatureItem>(`/studios/${studioId}/features/${key}`, {
        enabled,
      }),
    onMutate: async ({ key, enabled }) => {
      inFlight.current += 1;
      const gen = (generation.current.get(key) ?? 0) + 1;
      generation.current.set(key, gen);

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
    <div className={styles.featureGroups}>
      {headerActions || (showCounts && totalCount) ? (
        <div className={styles.sectionBody}>
          {headerActions}
          {showCounts && totalCount ? (
            <p className={styles.fieldDescription}>
              {enabledCount} of {totalCount} enabled
            </p>
          ) : null}
        </div>
      ) : null}

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

      {grouped.map((group) => (
        <section key={group.category}>
          <div className={styles.featureGroupHeader}>
            <span className={styles.featureGroupIcon} aria-hidden>
              <Icon name={featureCategoryIcon(group.category)} />
            </span>
            <h2 className={styles.featureGroupTitle}>{group.category}</h2>
          </div>
          <ul className={styles.toggleList}>
            {group.features.map((feature) => (
              <li key={feature.key}>
                <SettingsToggleRow
                  name={feature.name}
                  description={feature.description}
                  enabled={feature.enabled}
                  icon={<Icon name={featureIcon(feature.key)} />}
                  testId={`feature-toggle-${feature.key}`}
                  control={
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
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
