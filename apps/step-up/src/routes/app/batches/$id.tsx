import { Button } from "@dev-ui/components/button";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/constants";
import { useStudioId } from "@/lib/use-studio-id";
import { BatchDetailSkeleton } from "@/modules/batches/batch-detail-skeleton";
import { BatchOverview } from "@/modules/batches/batch-overview";
import { BatchRevenue } from "@/modules/batches/batch-revenue";
import { BatchRoster } from "@/modules/batches/batch-roster";
import { BatchSessionsLane } from "@/modules/batches/batch-sessions-lane";
import { BatchTrainers } from "@/modules/batches/batch-trainers";
import { BatchChatButton } from "@/modules/chat/batch-chat-button";
import type { Studio } from "@/modules/settings/types";
import { BatchShareSheet } from "@/modules/share-card/batch-share-sheet";
import { ApiState } from "@/modules/ui/api-state";
import { AppSheet } from "@/modules/ui/app-sheet";
import { PageHeader } from "@/modules/ui/page-header";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./new.module.scss";

type Batch = {
  id: string;
  name: string;
  coverImageUrl?: string | null;
  category?: "KIDS" | "ADULTS";
  styleBadge?: string | null;
  danceCategories?: Array<{ name: string; description?: string }>;
  capacity: number;
  enrollmentMode: "STAFF_ONLY" | "SELF_JOIN";
  enrollmentCount?: number;
  occupiedSeats?: number;
  remainingSeats?: number;
  scheduleLabel?: string | null;
  enrollments?: Array<{ enrolledAt?: string }>;
  sessions?: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status?: string;
  }>;
  active: boolean;
  branch?: {
    id: string;
    name: string;
    address: string;
  } | null;
  trainers: BatchTrainerAssignment[];
};

type BatchTrainerAssignment = {
  trainerId: string;
  trainer: {
    id: string;
    name: string;
    email: string;
    photoUrl?: string | null;
  };
};

export const Route = createFileRoute("/app/batches/$id")({
  component: EditBatchPage,
});

function EditBatchPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const { user } = useAuth();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("EditBatchPage");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const canViewPayments = isAdminRole(user?.role);

  const query = useQuery({
    queryKey: ["batch", id],
    queryFn: () => api.get<Batch>(`/batches/${id}`),
  });

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
    enabled: Boolean(studioId),
  });

  const deleteBatch = useMutation({
    mutationFn: () => api.delete(`/batches/${id}`),
    onSuccess: async () => {
      setDeleteOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batches", studioId] }),
        queryClient.removeQueries({ queryKey: ["batch", id] }),
      ]);
      toast({
        title: "Batch deleted",
        description: "The batch was removed.",
        variant: "success",
      });
      await navigate({ to: "/app/batches" });
    },
  });

  const audienceCount =
    query.data?.enrollmentCount ?? query.data?.enrollments?.length ?? 0;
  const canDelete = Boolean(query.data) && audienceCount === 0;

  return (
    <section className="page stack">
      <PageHeader
        title={query.data?.name ?? "Batch"}
        titleEnd={
          query.data ? (
            <BatchChatButton
              batchId={query.data.id}
              messagesTo="/app/messages/$id"
            />
          ) : null
        }
        description="Roster, instructors, and sessions."
        actions={
          <div className={styles.headerActions}>
            {query.data ? (
              <Button
                variant="quiet"
                data-testid="batch-share"
                onClick={() => setShareOpen(true)}
              >
                <Icon name="share" />
                Share Batch
              </Button>
            ) : null}
            {query.data ? (
              <Button
                variant="quiet"
                data-testid="batch-settings"
                onClick={() =>
                  void navigate({
                    to: "/app/batches/$id/settings",
                    params: { id },
                  })
                }
              >
                Settings
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="danger"
                data-testid="delete-batch"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            ) : null}
            <Button as={Link} to="/app/batches" variant="quiet">
              Back
            </Button>
          </div>
        }
      />

      {query.isLoading ? (
        <BatchDetailSkeleton showRevenue={canViewPayments} />
      ) : (
        <ApiState
          isLoading={false}
          isError={query.isError}
          error={query.error}
          data={query.data}
          emptyTitle="Batch not found"
          emptyDescription="This batch is unavailable."
        >
          {(batch) => (
            <div className="stack">
              <BatchOverview
                name={batch.name}
                coverImageUrl={batch.coverImageUrl}
                active={batch.active}
                capacity={batch.capacity}
                enrollmentMode={batch.enrollmentMode}
                occupiedSeats={batch.occupiedSeats}
                remainingSeats={batch.remainingSeats}
                enrollmentCount={batch.enrollmentCount}
                enrollments={batch.enrollments}
                scheduleLabel={batch.scheduleLabel}
                branchName={batch.branch?.name}
                sessions={batch.sessions}
                trainers={batch.trainers.map((row: BatchTrainerAssignment) => ({
                  id: row.trainer.id,
                  name: row.trainer.name,
                  photoUrl: row.trainer.photoUrl ?? null,
                }))}
              />
              {canViewPayments ? <BatchRevenue batchId={batch.id} /> : null}
              <BatchTrainers batchId={batch.id} trainers={batch.trainers} />
              <BatchSessionsLane batchId={batch.id} sessions={batch.sessions} />
              <BatchRoster
                batchId={batch.id}
                capacity={batch.capacity}
                active={batch.active}
              />
            </div>
          )}
        </ApiState>
      )}

      {query.data ? (
        <BatchShareSheet
          isOpen={shareOpen}
          onOpenChange={setShareOpen}
          batch={query.data}
          studio={studioQuery.data ?? { name: "Studio" }}
        />
      ) : null}

      <AppSheet
        isOpen={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleteBatch.isPending) {
            setDeleteOpen(false);
          }
        }}
        title="Delete batch"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Delete “{query.data?.name}”? This cannot be undone.
          </p>
          {deleteBatch.isError ? (
            <ErrorState
              description={
                deleteBatch.error instanceof Error
                  ? deleteBatch.error.message
                  : "The batch could not be deleted."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={deleteBatch.isPending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={deleteBatch.isPending}
              data-testid="confirm-delete-batch"
              onClick={() => deleteBatch.mutate()}
            >
              Delete batch
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </section>
  );
}
