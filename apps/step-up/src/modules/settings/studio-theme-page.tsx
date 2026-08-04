import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { ThemePanel } from "@/modules/branding/theme-panel";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";

export function StudioThemePage() {
  const api = useApi();
  const studioId = useStudioId();

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  return (
    <Screen
      title="Theme"
      subtitle="Studio colors for members and staff."
      showBack
      backTo="/app/settings"
    >
      {studioQuery.isLoading ? (
        <SkeletonBlock height="16rem" radius="var(--radius-2xl)" />
      ) : null}

      {studioQuery.isError ? (
        <ErrorState
          description={
            studioQuery.error instanceof Error
              ? studioQuery.error.message
              : "Unable to load theme."
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

      {studioQuery.isFetched && !studioQuery.data ? (
        <EmptyState
          title="Studio not found"
          description="Unable to load theme."
        />
      ) : null}

      {studioQuery.data ? (
        <ThemePanel
          studioName={studioQuery.data.name}
          brandTheme={studioQuery.data.brandTheme ?? null}
        />
      ) : null}
    </Screen>
  );
}
