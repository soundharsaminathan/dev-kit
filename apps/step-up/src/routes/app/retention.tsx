import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { formatActiveDuration } from "@/lib/format-active-duration";
import { useStudioId } from "@/lib/use-studio-id";
import { useStudioTrainers } from "@/modules/trainers/use-trainers";
import { AnimatedMetric } from "@/modules/ui/animated-metric";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type Batch = { id: string; name: string };

type Absentee = {
  studentId: string;
  studentName: string;
  createdAt?: string;
  sessionId: string;
  sessionStartsAt: string;
};

type BatchRetentionStats = {
  batchId: string;
  enrolledCount: number;
  renewedCount: number;
  renewalRatePercent: number;
  atRiskCount: number;
  absenteeList: Absentee[];
};

type TrainerRetentionStats = {
  trainerId: string;
  studioId: string;
  totalBookings: number;
  completedCount: number;
  cancelledCount: number;
  completionRate: number;
  recentStudents: Array<{
    studentId: string;
    studentName: string;
    createdAt?: string;
    status: string;
  }>;
};

function formatSessionDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const Route = createFileRoute("/app/retention")({
  component: RetentionPage,
});

function RetentionPage() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(
    null,
  );

  const batchesQuery = useQuery({
    queryKey: ["batches", studioId],
    queryFn: () => api.get<Batch[]>(`/batches/studio/${studioId}`),
  });

  const trainersQuery = useStudioTrainers();

  const batchId = selectedBatchId ?? batchesQuery.data?.[0]?.id ?? null;
  const trainerId = selectedTrainerId ?? trainersQuery.data?.[0]?.id ?? null;

  const selectedBatch = batchesQuery.data?.find(
    (batch) => batch.id === batchId,
  );
  const selectedTrainer = trainersQuery.data?.find(
    (trainer) => trainer.id === trainerId,
  );

  const retentionQuery = useQuery({
    queryKey: ["retention", "batch", batchId],
    queryFn: () => api.get<BatchRetentionStats>(`/retention/batch/${batchId}`),
    enabled: Boolean(batchId),
  });

  const trainerQuery = useQuery({
    queryKey: ["retention", "trainer", trainerId, studioId],
    queryFn: () =>
      api.get<TrainerRetentionStats>(
        `/retention/trainer/${trainerId}?studioId=${studioId}`,
      ),
    enabled: Boolean(trainerId),
  });

  async function refresh() {
    await Promise.all([
      batchesQuery.refetch(),
      trainersQuery.refetch(),
      batchId ? retentionQuery.refetch() : Promise.resolve(),
      trainerId ? trainerQuery.refetch() : Promise.resolve(),
    ]);
  }

  const batchLoading =
    batchesQuery.isLoading || (batchId && retentionQuery.isLoading);
  const batchError = batchesQuery.isError || retentionQuery.isError;
  const batchErrorMessage =
    (retentionQuery.error ?? batchesQuery.error) instanceof Error
      ? ((retentionQuery.error ?? batchesQuery.error) as Error).message
      : "Could not load batch retention.";

  return (
    <Screen
      title="Retention"
      subtitle="Renewal health across batches and trainers."
    >
      <PullToRefresh onRefresh={refresh}>
        <div className={staff.section}>
          {batchError ? (
            <ErrorState
              description={batchErrorMessage}
              action={
                <TouchButton variant="primary" onClick={() => void refresh()}>
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {batchesQuery.isLoading ? (
            <SkeletonBlock height="2.75rem" radius="var(--radius-2xl)" />
          ) : null}

          {batchesQuery.data && batchesQuery.data.length > 0 ? (
            <Select
              selectedKey={batchId ?? null}
              placeholder="Select a batch"
              onSelectionChange={(key) => setSelectedBatchId(key as string)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {batchesQuery.data.map((batch) => (
                  <SelectItem key={batch.id} id={batch.id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {batchLoading ? (
            <div className={staff.statGrid}>
              <SkeletonBlock height="6.25rem" radius="var(--radius-2xl)" />
              <SkeletonBlock height="6.25rem" radius="var(--radius-2xl)" />
              <SkeletonBlock height="6.25rem" radius="var(--radius-2xl)" />
              <SkeletonBlock height="6.25rem" radius="var(--radius-2xl)" />
            </div>
          ) : null}

          {!batchesQuery.isLoading && !batchId ? (
            <EmptyState
              icon={ENTITY_ICONS.batch}
              title="No retention data"
              description="Create a batch with enrollments to see stats."
            />
          ) : null}

          {retentionQuery.data ? (
            <>
              <div className={staff.section}>
                <p className={staff.sectionTitle}>
                  Batch · {selectedBatch?.name ?? "Selected batch"}
                </p>
                <div className={staff.statGrid}>
                  <div className={staff.statTile}>
                    <span className={staff.statLabel}>Enrolled</span>
                    <AnimatedMetric
                      className={staff.statValue}
                      value={retentionQuery.data.enrolledCount}
                    />
                  </div>
                  <div className={staff.statTile}>
                    <span className={staff.statLabel}>Renewed</span>
                    <AnimatedMetric
                      className={staff.statValue}
                      value={retentionQuery.data.renewedCount}
                    />
                  </div>
                  <div className={staff.statTile}>
                    <span className={staff.statLabel}>Renewal rate</span>
                    <AnimatedMetric
                      className={staff.statValue}
                      value={retentionQuery.data.renewalRatePercent}
                    />
                    <span className={staff.rowMeta}>percent</span>
                  </div>
                  <div className={staff.statTile}>
                    <span className={staff.statLabel}>At risk</span>
                    <AnimatedMetric
                      className={staff.statValue}
                      value={retentionQuery.data.atRiskCount}
                    />
                  </div>
                </div>
              </div>

              {retentionQuery.data.absenteeList.length > 0 ? (
                <div className={staff.section}>
                  <p className={staff.sectionTitle}>Recent absences</p>
                  <div className={staff.list}>
                    {retentionQuery.data.absenteeList.map((absentee) => {
                      const activeDuration = formatActiveDuration(
                        absentee.createdAt,
                      );
                      return (
                        <PressableCard
                          key={`${absentee.studentId}-${absentee.sessionId}`}
                          onClick={() =>
                            void navigate({
                              to: "/app/students/$id",
                              params: { id: absentee.studentId },
                            })
                          }
                        >
                          <div className={staff.rowCard}>
                            <span className={staff.rowTitle}>
                              {absentee.studentName}
                            </span>
                            {activeDuration ? (
                              <span className={staff.rowMeta}>
                                {activeDuration}
                              </span>
                            ) : null}
                            <span className={staff.rowMeta}>
                              Missed{" "}
                              {formatSessionDate(absentee.sessionStartsAt)}
                            </span>
                          </div>
                        </PressableCard>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No recent absences"
                  description="Absent students for this batch will appear here."
                />
              )}
            </>
          ) : null}

          {trainersQuery.isLoading ? (
            <SkeletonBlock height="2.75rem" radius="var(--radius-2xl)" />
          ) : null}

          {trainersQuery.data && trainersQuery.data.length > 0 ? (
            <Select
              selectedKey={trainerId ?? null}
              placeholder="Select a trainer"
              onSelectionChange={(key) => setSelectedTrainerId(key as string)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trainersQuery.data.map((trainer) => (
                  <SelectItem key={trainer.id} id={trainer.id}>
                    {trainer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {trainerQuery.isLoading ? (
            <SkeletonBlock height="8rem" radius="var(--radius-2xl)" />
          ) : null}

          {trainerQuery.isError ? (
            <ErrorState
              description={
                trainerQuery.error instanceof Error
                  ? trainerQuery.error.message
                  : "Could not load trainer retention."
              }
            />
          ) : null}

          {trainerQuery.data ? (
            <div className={staff.softPanel}>
              <p className={staff.panelTitle}>Trainer retention</p>
              <p className={staff.panelDesc}>
                {selectedTrainer?.name ?? "Selected trainer"}
              </p>
              <div className={staff.statGrid}>
                <div className={staff.statTile}>
                  <span className={staff.statLabel}>Total bookings</span>
                  <AnimatedMetric
                    className={staff.statValue}
                    value={trainerQuery.data.totalBookings}
                  />
                </div>
                <div className={staff.statTile}>
                  <span className={staff.statLabel}>Completed</span>
                  <AnimatedMetric
                    className={staff.statValue}
                    value={trainerQuery.data.completedCount}
                  />
                </div>
                <div className={staff.statTile}>
                  <span className={staff.statLabel}>Completion rate</span>
                  <AnimatedMetric
                    className={staff.statValue}
                    value={trainerQuery.data.completionRate}
                  />
                  <span className={staff.rowMeta}>percent</span>
                </div>
                <div className={staff.statTile}>
                  <span className={staff.statLabel}>Cancelled</span>
                  <AnimatedMetric
                    className={staff.statValue}
                    value={trainerQuery.data.cancelledCount}
                  />
                </div>
              </div>

              {trainerQuery.data.recentStudents.length > 0 ? (
                <div className={staff.list}>
                  {trainerQuery.data.recentStudents.map((student) => {
                    const activeDuration = formatActiveDuration(
                      student.createdAt,
                    );
                    return (
                      <PressableCard
                        key={student.studentId}
                        onClick={() =>
                          void navigate({
                            to: "/app/students/$id",
                            params: { id: student.studentId },
                          })
                        }
                      >
                        <div className={staff.rowCard}>
                          <span className={staff.rowTitle}>
                            {student.studentName}
                          </span>
                          {activeDuration ? (
                            <span className={staff.rowMeta}>
                              {activeDuration}
                            </span>
                          ) : null}
                          <span className={staff.rowMeta}>
                            {student.status}
                          </span>
                        </div>
                      </PressableCard>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {!trainersQuery.isLoading &&
          !trainersQuery.isError &&
          (trainersQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={ENTITY_ICONS.trainer}
              title="No trainer stats"
              description="Add trainers to your studio to see retention."
            />
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
