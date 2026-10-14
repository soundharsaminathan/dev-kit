import { Switch } from "@dev-ui/components/switch";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import {
  type MarketplaceMediaAlert,
  type StudioMarketplaceToggleKey,
  STUDIO_MARKETPLACE_TOGGLES,
  studioMarketplaceTogglesFrom,
} from "@/modules/marketplace/controls";
import { SkeletonRowList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { StatusBanner } from "@/modules/ui/status-banner";
import { TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";
import { SettingsToggleRow } from "./ui";
import styles from "./ui/settings-ui.module.scss";
import marketplaceStyles from "./studio-marketplace-page.module.scss";

type ToggleVariables = { key: StudioMarketplaceToggleKey; enabled: boolean };
type ToggleContext = ToggleVariables & { gen: number };

type AlertsResponse = { items: Array<MarketplaceMediaAlert & { href: string }> };

export function StudioMarketplacePage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioMarketplacePage");
  const queryKey = ["studio", studioId] as const;
  const inFlight = useRef(0);
  const generation = useRef(new Map<string, number>());

  const studioQuery = useQuery({
    queryKey,
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const alertsQuery = useQuery({
    queryKey: ["marketplace-alerts", studioId],
    queryFn: () =>
      api.get<AlertsResponse>(`/studios/${studioId}/marketplace-alerts`),
  });

  const toggles = studioMarketplaceTogglesFrom(studioQuery.data?.settings);

  const toggleMutation = useMutation<
    Studio["settings"],
    Error,
    ToggleVariables,
    ToggleContext
  >({
    mutationFn: ({ key, enabled }) =>
      api.patch<Studio["settings"]>(`/studios/${studioId}/settings`, {
        [key]: enabled,
      }),
    onMutate: async ({ key, enabled }) => {
      inFlight.current += 1;
      const gen = (generation.current.get(key) ?? 0) + 1;
      generation.current.set(key, gen);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Studio>(queryKey, (prev) => {
        if (!prev?.settings) return prev;
        return {
          ...prev,
          settings: {
            ...prev.settings,
            ...studioMarketplaceTogglesFrom(prev.settings),
            [key]: enabled,
          },
        };
      });
      return { key, enabled, gen };
    },
    onError: (error, variables, context) => {
      if (context && generation.current.get(variables.key) === context.gen) {
        queryClient.setQueryData<Studio>(queryKey, (prev) => {
          if (!prev?.settings) return prev;
          return {
            ...prev,
            settings: {
              ...prev.settings,
              ...studioMarketplaceTogglesFrom(prev.settings),
              [variables.key]: !variables.enabled,
            },
          };
        });
      }
      toast({
        title: "Couldn’t update listing",
        description:
          error instanceof Error ? error.message : "Could not update setting.",
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

  const visibility = STUDIO_MARKETPLACE_TOGGLES.filter(
    (item) => item.group === "visibility",
  );
  const booking = STUDIO_MARKETPLACE_TOGGLES.filter(
    (item) => item.group === "booking",
  );
  const alerts = alertsQuery.data?.items ?? [];

  return (
    <div className={marketplaceStyles.page}>
      {studioQuery.isLoading ? (
        <SkeletonRowList count={8} label="Loading marketplace settings" />
      ) : null}

      {studioQuery.isError ? (
        <ErrorState
          description={
            studioQuery.error instanceof Error
              ? studioQuery.error.message
              : "Could not load marketplace settings."
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

      {studioQuery.data ? (
        <div className={marketplaceStyles.columns}>
          <section>
            <div className={styles.featureGroupHeader}>
              <span className={styles.featureGroupIcon} aria-hidden>
                <Icon name="eye" />
              </span>
              <h2 className={styles.featureGroupTitle}>Public visibility</h2>
            </div>
            <ul className={styles.toggleList}>
              {visibility.map((item) => (
                <li key={item.key}>
                  <SettingsToggleRow
                    name={item.label}
                    description={item.description}
                    enabled={toggles[item.key]}
                    testId={`marketplace-toggle-${item.key}`}
                    control={
                      <Switch
                        isSelected={toggles[item.key]}
                        aria-label={`Toggle ${item.label}`}
                        onChange={(enabled) => {
                          toggleMutation.mutate({
                            key: item.key,
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
          <section>
            <div className={styles.featureGroupHeader}>
              <span className={styles.featureGroupIcon} aria-hidden>
                <Icon name="calendar" />
              </span>
              <h2 className={styles.featureGroupTitle}>Booking</h2>
            </div>
            <ul className={styles.toggleList}>
              {booking.map((item) => (
                <li key={item.key}>
                  <SettingsToggleRow
                    name={item.label}
                    description={item.description}
                    enabled={toggles[item.key]}
                    testId={`marketplace-toggle-${item.key}`}
                    control={
                      <Switch
                        isSelected={toggles[item.key]}
                        aria-label={`Toggle ${item.label}`}
                        onChange={(enabled) => {
                          toggleMutation.mutate({
                            key: item.key,
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
        </div>
      ) : null}

      <section className={marketplaceStyles.alerts}>
        <h2 className={styles.featureGroupTitle}>Needs a photo</h2>
        <p className={styles.fieldDescription}>
          Each class, studio, or trainer is hidden on classa until it has its
          own cover. This is not a studio-wide draft.
        </p>
        {alertsQuery.isLoading ? (
          <SkeletonRowList count={3} label="Loading photo alerts" />
        ) : null}
        {alertsQuery.data && alerts.length === 0 ? (
          <EmptyState
            title="All set"
            description="Every listed class, studio cover, and trainer photo is ready."
          />
        ) : null}
        <ul className={marketplaceStyles.alertList}>
          {alerts.map((alert) => (
            <li key={`${alert.kind}-${alert.objectId}`}>
              <StatusBanner
                tone="warning"
                role="alert"
                title={alert.objectName}
                meta={alert.message}
                action={
                  <a href={alert.href} data-testid={`alert-fix-${alert.kind}`}>
                    Fix
                  </a>
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
