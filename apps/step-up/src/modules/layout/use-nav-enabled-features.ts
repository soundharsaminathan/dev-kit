import {
  enabledFeatureKeys,
  useStudioFeatures,
} from "@/lib/studio-features";
import type { ShellVariant } from "@/modules/layout/nav-config";

/** null = loading (hide gated); undefined = no filter (admin); Set = filter. */
export function useNavEnabledFeatures(
  variant: ShellVariant,
): Set<string> | null | undefined {
  const featuresQuery = useStudioFeatures();
  if (variant === "admin") {
    return undefined;
  }
  if (featuresQuery.isLoading || featuresQuery.isPending) {
    return null;
  }
  return enabledFeatureKeys(featuresQuery.data?.features);
}
