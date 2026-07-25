import { Badge } from "@dev-ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./attendance.module.scss";

type Batch = {
  id: string;
  name: string;
};

type Session = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type AttendanceRecord = {
  id: string;
  status: "PRESENT" | "ABSENT";
  sessionId: string;
};

export const Route = createFileRoute("/me/attendance")({
  component: MeAttendancePage,
});

function MeAttendancePage() {
  const api = useApi();
  const { studentId } = useActiveStudentContext();

  const batchesQuery = useQuery({
    queryKey: ["batches", STUDIO_ID],
    queryFn: () => api.get<Batch[]>(`/batches/studio/${STUDIO_ID}`),
  });

  const firstBatchId = batchesQuery.data?.[0]?.id;

  const sessionsQuery = useQuery({
    queryKey: ["sessions", firstBatchId],
    queryFn: () => api.get<Session[]>(`/sessions/batch/${firstBatchId}`),
    enabled: Boolean(firstBatchId),
  });

  const firstSessionId = sessionsQuery.data?.[0]?.id;

  const attendanceQuery = useQuery({
    queryKey: ["attendance", firstSessionId, studentId],
    queryFn: async () => {
      const records = await api.get<AttendanceRecord[]>(
        `/attendance/session/${firstSessionId}`,
      );
      return records;
    },
    enabled: Boolean(firstSessionId),
  });

  const isLoading =
    attendanceQuery.isLoading ||
    sessionsQuery.isLoading ||
    batchesQuery.isLoading;
  const isError =
    attendanceQuery.isError || sessionsQuery.isError || batchesQuery.isError;
  const error =
    attendanceQuery.error ?? sessionsQuery.error ?? batchesQuery.error;

  async function refresh() {
    await Promise.all([
      batchesQuery.refetch(),
      sessionsQuery.refetch(),
      attendanceQuery.refetch(),
    ]);
  }

  return (
    <Screen
      title="Attendance"
      subtitle="Your recent class attendance."
      showBack
      backTo="/me/profile"
    >
      <PullToRefresh onRefresh={refresh}>
        {isLoading ? <SkeletonCardList count={3} /> : null}

        {isError ? (
          <ErrorState
            description={
              error instanceof Error
                ? error.message
                : "Could not load attendance."
            }
            action={
              <TouchButton variant="primary" onClick={() => void refresh()}>
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {!isLoading &&
        !isError &&
        (!attendanceQuery.data || attendanceQuery.data.length === 0) ? (
          <EmptyState
            title="No attendance yet"
            description="Attendance records appear after your first class."
          />
        ) : null}

        {attendanceQuery.data && attendanceQuery.data.length > 0 ? (
          <div className={styles.list}>
            {attendanceQuery.data.map((record) => (
              <div
                key={record.id}
                className={styles.row}
                data-testid={`attendance-row-${record.sessionId}`}
              >
                <div className={styles.rowBody}>
                  <p className={styles.rowTitle}>Session</p>
                  <p className={styles.rowMeta}>{record.sessionId}</p>
                </div>
                <Badge
                  variant={record.status === "PRESENT" ? "success" : "danger"}
                >
                  {record.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : null}
      </PullToRefresh>
    </Screen>
  );
}
