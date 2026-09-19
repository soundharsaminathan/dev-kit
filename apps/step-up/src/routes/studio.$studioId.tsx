import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicShell } from "@/modules/layout/public-shell";
import { fetchDiscoverStudio } from "@/modules/student-landing/api";
import { StudioLanding } from "@/modules/student-landing/studio-landing";
import { TrialRequestSheet } from "@/modules/student-landing/trial-request-sheet";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./studio.module.scss";

export const Route = createFileRoute("/studio/$studioId")({
  component: StudioPage,
});

function StudioPage() {
  const { studioId } = Route.useParams();
  const [trialOpen, setTrialOpen] = useState(false);
  const query = useQuery({
    queryKey: ["discover-studio", studioId],
    queryFn: () => fetchDiscoverStudio(studioId),
  });

  const studio = query.data;

  return (
    <PublicShell nav="student" width="full" dock>
      {query.isLoading ? (
        <div className={styles.loading}>
          <SkeletonBlock height="18rem" />
          <SkeletonBlock height="2rem" width="60%" />
          <SkeletonBlock height="6rem" />
        </div>
      ) : null}
      {query.isError ? (
        <div className={styles.loading}>
          <ErrorState
            description={
              query.error instanceof Error
                ? query.error.message
                : "Could not load studio."
            }
            action={
              <TouchButton variant="primary" onClick={() => query.refetch()}>
                Try again
              </TouchButton>
            }
          />
        </div>
      ) : null}
      {studio ? (
        <>
          <StudioLanding
            studio={studio}
            onBookTrial={() => setTrialOpen(true)}
            dockHidden={trialOpen}
          />
          <TrialRequestSheet
            open={trialOpen}
            onOpenChange={setTrialOpen}
            studioId={studio.id}
            studioName={studio.name}
          />
        </>
      ) : null}
      {!query.isLoading && !query.isError && !studio ? (
        <div className={styles.loading}>
          <EmptyState title="Studio not found" />
        </div>
      ) : null}
    </PublicShell>
  );
}
