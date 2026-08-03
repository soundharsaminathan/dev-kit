import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { BrandingPanel } from "@/modules/branding/branding-panel";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";

export function StudioBrandingPage() {
  const api = useApi();
  const studioId = useStudioId();

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  return (
    <Screen
      title="Branding"
      subtitle="Logo, home hero images, and studio theme."
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
              : "Unable to load branding."
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
          description="Unable to load branding."
        />
      ) : null}

      {studioQuery.data ? (
        <BrandingPanel
          studioName={studioQuery.data.name}
          logoUrl={studioQuery.data.logoUrl ?? null}
          heroMobileUrl={studioQuery.data.heroMobileUrl ?? null}
          heroDesktopUrl={studioQuery.data.heroDesktopUrl ?? null}
          brandTheme={studioQuery.data.brandTheme ?? null}
        />
      ) : null}
    </Screen>
  );
}
