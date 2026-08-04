import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { type DanceStyle, effectiveDanceStyles } from "@/lib/dance-styles";
import { useOptionalStudioId } from "@/lib/use-studio-id";
import type { Studio } from "@/modules/settings/types";

export function useStudioDanceStyles() {
  const api = useApi();
  const studioId = useOptionalStudioId();

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
    enabled: Boolean(studioId),
  });

  const stored = studioQuery.data?.settings?.danceStyles ?? null;
  const styles: DanceStyle[] = effectiveDanceStyles(stored);

  return {
    styles,
    stored,
    isCustom: stored !== null,
    isLoading: Boolean(studioId) && studioQuery.isLoading,
    isError: studioQuery.isError,
    error: studioQuery.error,
    refetch: studioQuery.refetch,
  };
}
