import type { ReactNode } from "react";
import type { FeatureKey } from "@/lib/feature-keys";
import { isFeatureEnabled, useStudioFeatures } from "@/lib/studio-features";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState } from "@/modules/ui/states";

type RequireStudioFeatureProps = {
  feature: FeatureKey;
  children: ReactNode;
  /** When false, skip Screen wrapper (caller already has one). Default true. */
  wrapScreen?: boolean;
  title?: string;
};

export function RequireStudioFeature({
  feature,
  children,
  wrapScreen = true,
  title = "Feature unavailable",
}: RequireStudioFeatureProps) {
  const query = useStudioFeatures();

  if (query.isLoading || query.isPending) {
    const loading = <SkeletonBlock height="8rem" />;
    return wrapScreen ? <Screen title="Loading">{loading}</Screen> : loading;
  }

  if (!isFeatureEnabled(query.data?.features, feature)) {
    const description =
      "This module is not enabled for your studio. Contact your system administrator if you need access.";
    const empty = wrapScreen ? (
      <EmptyState description={description} />
    ) : (
      <EmptyState title={title} description={description} />
    );
    return wrapScreen ? (
      <Screen title={title} showBack>
        {empty}
      </Screen>
    ) : (
      empty
    );
  }

  return <>{children}</>;
}
