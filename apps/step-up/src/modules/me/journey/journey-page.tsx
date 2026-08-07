import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { DanceLoader } from "@/modules/ui/dance-loader";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { JourneyCanvas } from "./journey-canvas";
import styles from "./journey-page.module.scss";
import type { JourneyPayload } from "./journey-types";

export function JourneyPage() {
  const api = useApi();
  const { studentId, loading: studentLoading } = useActiveStudentContext();
  const resolvedStudentId = studentId.trim();

  const journeyQuery = useQuery({
    queryKey: ["journey", resolvedStudentId] as const,
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (resolvedStudentId) params.set("studentId", resolvedStudentId);
      const query = params.toString();
      return api.get<JourneyPayload>(`/journey${query ? `?${query}` : ""}`, {
        signal,
      });
    },
    enabled: Boolean(resolvedStudentId),
    staleTime: 30_000,
  });

  if (studentLoading || (resolvedStudentId && journeyQuery.isLoading)) {
    return (
      <div className={styles.page}>
        <div className={styles.stateWrap}>
          <DanceLoader label="Loading your journey" />
        </div>
      </div>
    );
  }

  if (journeyQuery.isError) {
    return (
      <div className={styles.page}>
        <div className={styles.stateWrap}>
          <ErrorState
            title="Couldn’t load journey"
            description="Check your connection and try again."
            action={
              <TouchButton onClick={() => void journeyQuery.refetch()}>
                Retry
              </TouchButton>
            }
          />
        </div>
      </div>
    );
  }

  const data = journeyQuery.data;
  if (!data || !resolvedStudentId) {
    return (
      <div className={styles.page}>
        <div className={styles.stateWrap}>
          <EmptyState
            icon="map"
            title="No journey yet"
            description="Join a batch to start mapping your dance path."
          />
        </div>
      </div>
    );
  }

  if (data.events.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.stateWrap}>
          <EmptyState
            icon="map"
            title="Your path starts soon"
            description="Attendance, batches, and achievements will appear here as a living map."
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="journey-page">
      <JourneyCanvas payload={data} studentId={resolvedStudentId} />
    </div>
  );
}
