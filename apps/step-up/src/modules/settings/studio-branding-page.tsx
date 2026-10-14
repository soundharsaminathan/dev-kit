import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { StudioBrandingWorkspace } from "./studio-branding-workspace";
import type { Studio } from "./types";

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

  return <StudioBrandingWorkspace studio={studioQuery.data} />;
}
