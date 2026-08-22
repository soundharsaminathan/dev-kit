import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { BrandingPanel } from "@/modules/branding/branding-panel";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";
import { SettingsSection } from "./ui";

export function StudioBrandingPage() {
  const api = useApi();
  const studioId = useStudioId();

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  if (studioQuery.isLoading) {
    return <SkeletonBlock height="16rem" radius="var(--radius-xl)" />;
  }

  if (studioQuery.isError) {
    return (
      <ErrorState
        description={
          studioQuery.error instanceof Error
            ? studioQuery.error.message
            : "Unable to load branding."
        }
        action={
          <TouchButton variant="primary" onClick={() => studioQuery.refetch()}>
            Try again
          </TouchButton>
        }
      />
    );
  }

  if (!studioQuery.data) {
    return (
      <EmptyState
        title="Studio not found"
        description="Unable to load branding."
      />
    );
  }

  return (
    <SettingsSection
      title="Assets"
      description="Logo and hero images used on the member home experience."
    >
      <BrandingPanel
        studioName={studioQuery.data.name}
        logoUrl={studioQuery.data.logoUrl ?? null}
        heroMobileUrl={studioQuery.data.heroMobileUrl ?? null}
        heroDesktopUrl={studioQuery.data.heroDesktopUrl ?? null}
      />
    </SettingsSection>
  );
}
