import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import type { FeatureKey } from "@/lib/feature-keys";
import { useOptionalStudioId } from "@/lib/use-studio-id";

export type StudioFeatureItem = {
  key: FeatureKey | string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  globallyEnabled?: boolean;
  dependsOnKeys?: string[];
};

export type StudioFeaturesResponse = {
  features: StudioFeatureItem[];
};

export function studioFeaturesQueryKey(studioId: string) {
  return ["studio-features", studioId] as const;
}

export function enabledFeatureKeys(
  features: StudioFeatureItem[] | undefined,
): Set<string> {
  const set = new Set<string>();
  for (const feature of features ?? []) {
    if (feature.enabled) {
      set.add(feature.key);
    }
  }
  return set;
}

export function isFeatureEnabled(
  features: StudioFeatureItem[] | undefined,
  key: FeatureKey,
): boolean {
  return features?.some((feature) => feature.key === key && feature.enabled) ===
    true;
}

/** Tenant studio features — skip when no studioId (system admin / public). */
export function useStudioFeatures(studioIdOverride?: string | null) {
  const api = useApi();
  const authStudioId = useOptionalStudioId();
  const studioId = studioIdOverride ?? authStudioId;

  return useQuery({
    queryKey: studioFeaturesQueryKey(studioId ?? ""),
    queryFn: () =>
      api.get<StudioFeaturesResponse>(`/studios/${studioId}/features`),
    enabled: Boolean(studioId),
    staleTime: 5 * 60_000,
  });
}

export function useIsFeatureEnabled(key: FeatureKey): boolean {
  const query = useStudioFeatures();
  if (query.isLoading || query.isPending) {
    return false;
  }
  return isFeatureEnabled(query.data?.features, key);
}
