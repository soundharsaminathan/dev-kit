import { Button } from "@dev-ui/components/button";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { AttendanceRosterTable } from "@/modules/attendance/attendance-roster-table";
import type {
  AttendanceRosterEntry,
  AttendanceStatusValue,
} from "@/modules/attendance/types";
import { ApiState } from "@/modules/ui/api-state";
import {
  ExpandableBentoGrid,
  type ExpandableBentoItem,
} from "@/modules/ui/expandable-bento-grid";
import { PageHeader } from "@/modules/ui/page-header";
import styles from "./sessions.$id.attendance.module.scss";

const QR_ITEM_ID = "check-in-qr";

type Session = {
  id: string;
  batchId: string;
  startsAt: string;
  endsAt: string;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  batch?: { name: string };
};

function formatSessionDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const Route = createFileRoute("/app/sessions/$id/attendance")({
  component: SessionAttendancePage,
});

function QrCanvas({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !token) return;
    void QRCode.toCanvas(canvasRef.current, token, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  }, [token]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.qrCanvas}
      aria-label="Session QR code for student check-in"
    />
  );
}

function SessionAttendancePage() {
  const { id } = Route.useParams();
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("SessionAttendancePage");
  const [activeQrId, setActiveQrId] = useState<string | null>(null);
  const qrOpen = activeQrId === QR_ITEM_ID;

  const sessionQuery = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.get<Session>(`/sessions/${id}`),
  });

  const rosterQuery = useQuery({
    queryKey: ["attendance-roster", id],
    queryFn: () =>
      api.get<AttendanceRosterEntry[]>(`/attendance/session/${id}/roster`),
    enabled: Boolean(id),
  });

  const qrQuery = useQuery({
    queryKey: ["session-qr", id],
    queryFn: () =>
      api.get<{ token: string; expiresAt: string }>(`/sessions/${id}/qr`),
    enabled: Boolean(id) && qrOpen,
    refetchInterval: qrOpen ? 60_000 : false,
  });

  function invalidateAttendance() {
    void queryClient.invalidateQueries({
      queryKey: ["attendance-roster", id],
    });
    void queryClient.invalidateQueries({ queryKey: ["attendance", id] });
  }

  const markAllPresent = useMutation({
    mutationFn: () =>
      api.post<{ marked: number; failed: number }>(
        `/attendance/session/${id}/mark-all-present`,
      ),
    onSuccess: (data) => {
      invalidateAttendance();
      toast({
        title: "All marked present",
        description:
          data.failed > 0
            ? `Marked ${data.marked} students present. ${data.failed} could not be marked.`
            : "Every student was marked present.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t mark all present",
        description:
          error instanceof Error
            ? error.message
            : "Could not mark all present.",
        variant: "error",
      });
    },
  });

  const markAttendance = useMutation({
    mutationFn: (payload: {
      studentId: string;
      status: AttendanceStatusValue;
    }) =>
      api.post("/attendance/mark", {
        sessionId: id,
        studentId: payload.studentId,
        status: payload.status,
        source: "TRAINER",
      }),
    onSuccess: () => {
      invalidateAttendance();
    },
    onError: (error) => {
      toast({
        title: "Couldn’t mark attendance",
        description:
          error instanceof Error ? error.message : "Could not mark attendance.",
        variant: "error",
      });
    },
  });

  const markSelected = useMutation({
    mutationFn: async (payload: {
      studentIds: string[];
      status: AttendanceStatusValue;
    }) => {
      const results = await Promise.allSettled(
        payload.studentIds.map((studentId) =>
          api.post("/attendance/mark", {
            sessionId: id,
            studentId,
            status: payload.status,
            source: "TRAINER",
          }),
        ),
      );
      return {
        marked: results.filter((result) => result.status === "fulfilled")
          .length,
        failed: results.filter((result) => result.status === "rejected").length,
        status: payload.status,
      };
    },
    onSuccess: (data) => {
      invalidateAttendance();
      const statusLabel = data.status === "PRESENT" ? "present" : "absent";
      toast({
        title: "Attendance updated",
        description:
          data.failed > 0
            ? `Marked ${data.marked} students ${statusLabel}. ${data.failed} could not be marked.`
            : `Selected students were marked ${statusLabel}.`,
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t mark selected",
        description:
          error instanceof Error
            ? error.message
            : "Could not mark selected students.",
        variant: "error",
      });
    },
  });

  const completeSession = useMutation({
    mutationFn: () => api.patch(`/sessions/${id}/complete`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["session", id] }),
        queryClient.invalidateQueries({
          queryKey: ["batch", sessionQuery.data?.batchId],
        }),
      ]);
      toast({
        title: "Session completed",
        description: "This session is marked complete.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t complete session",
        description:
          error instanceof Error
            ? error.message
            : "Could not complete session.",
        variant: "error",
      });
    },
  });

  const summary = useMemo(() => {
    const roster = rosterQuery.data ?? [];
    return {
      total: roster.length,
      present: roster.filter((entry) => entry.attendance?.status === "PRESENT")
        .length,
      absent: roster.filter((entry) => entry.attendance?.status === "ABSENT")
        .length,
      unmarked: roster.filter((entry) => !entry.attendance).length,
    };
  }, [rosterQuery.data]);

  const sessionDescription = sessionQuery.data
    ? [
        sessionQuery.data.batch?.name,
        formatSessionDateTime(sessionQuery.data.startsAt),
      ]
        .filter(Boolean)
        .join(" · ")
    : "Mark attendance for enrolled students.";

  const isBusy =
    markAllPresent.isPending ||
    markAttendance.isPending ||
    markSelected.isPending ||
    completeSession.isPending;

  const bulkError =
    markAllPresent.error ??
    markSelected.error ??
    markAttendance.error ??
    completeSession.error;
  const bulkResult = markSelected.data ?? markAllPresent.data;

  const canComplete = sessionQuery.data?.status === "SCHEDULED";

  const qrExpiresLabel = qrQuery.data
    ? formatSessionDateTime(qrQuery.data.expiresAt)
    : "session end";

  const qrItem: ExpandableBentoItem = {
    id: QR_ITEM_ID,
    title: "Check-in QR",
    subtitle: "Student self check-in",
    description: `Students scan this code to check in. Valid until ${qrExpiresLabel}.`,
    media: qrQuery.data?.token ? (
      <div className={styles.qrMediaFrame}>
        <QrCanvas token={qrQuery.data.token} />
      </div>
    ) : (
      <span className={styles.qrMediaIcon} aria-hidden>
        <Icon name="camera" />
      </span>
    ),
    content: (
      <p className={styles.qrHint}>
        {qrQuery.isError
          ? "QR code unavailable for this session."
          : qrQuery.isLoading || !qrQuery.data?.token
            ? "Generating QR code…"
            : "Display this at the front desk or projector for self check-in."}
      </p>
    ),
  };

  return (
    <section className={`page ${styles.root}`}>
      <PageHeader
        title="Session attendance"
        description={sessionDescription}
        actions={
          <div className={styles.headerActions}>
            {canComplete ? (
              <Button
                variant="default"
                isPending={completeSession.isPending}
                data-testid="complete-session"
                onClick={() => {
                  if (
                    window.confirm(
                      "Mark this session as completed? Attendance can still be reviewed afterward.",
                    )
                  ) {
                    completeSession.mutate();
                  }
                }}
              >
                Complete session
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => setActiveQrId(QR_ITEM_ID)}>
              Generate QR
            </Button>
          </div>
        }
      />

      <div className={styles.qrBento}>
        <ExpandableBentoGrid
          items={[qrItem]}
          activeId={activeQrId}
          onActiveIdChange={setActiveQrId}
          hideCards
          aria-label="Check-in QR"
        />
      </div>

      <ApiState
        isLoading={rosterQuery.isLoading || sessionQuery.isLoading}
        isError={rosterQuery.isError || sessionQuery.isError}
        error={rosterQuery.error ?? sessionQuery.error}
        data={rosterQuery.data}
        allowEmpty
        emptyTitle="No enrolled students"
        emptyDescription="Enroll students in this batch before taking attendance."
      >
        {(roster) => (
          <>
            {roster.length > 0 ? (
              <div className={styles.summaryRow}>
                <fieldset
                  className={styles.summary}
                  aria-label="Attendance summary"
                >
                  <span className={styles.statChip} data-tone="neutral">
                    <strong>{summary.total}</strong>
                    enrolled
                  </span>
                  <span
                    className={styles.statChip}
                    data-tone="present"
                    data-active={summary.present > 0 ? "" : undefined}
                  >
                    <strong>{summary.present}</strong>
                    present
                  </span>
                  <span
                    className={styles.statChip}
                    data-tone="absent"
                    data-active={summary.absent > 0 ? "" : undefined}
                  >
                    <strong>{summary.absent}</strong>
                    absent
                  </span>
                  <span
                    className={styles.statChip}
                    data-tone="unmarked"
                    data-active={summary.unmarked > 0 ? "" : undefined}
                  >
                    <strong>{summary.unmarked}</strong>
                    unmarked
                  </span>
                </fieldset>
              </div>
            ) : null}

            {bulkError ? (
              <p className={styles.bulkError} role="alert">
                {bulkError instanceof Error
                  ? bulkError.message
                  : "Could not update attendance."}
              </p>
            ) : null}

            {bulkResult && bulkResult.failed > 0 ? (
              <p className={styles.bulkWarning} role="status">
                Marked {bulkResult.marked} students
                {"status" in bulkResult && bulkResult.status
                  ? ` ${bulkResult.status === "PRESENT" ? "present" : "absent"}`
                  : " present"}
                . {bulkResult.failed} could not be marked — check subscriptions
                and try again individually.
              </p>
            ) : null}

            {roster.length > 0 ? (
              <AttendanceRosterTable
                roster={roster}
                isBusy={isBusy}
                pendingStudentId={
                  markAttendance.isPending
                    ? (markAttendance.variables?.studentId ?? null)
                    : null
                }
                unmarkedCount={summary.unmarked}
                onMarkAllUnmarkedPresent={() => markAllPresent.mutate()}
                onMarkOne={(studentId, status) =>
                  markAttendance.mutate({ studentId, status })
                }
                onMarkSelected={(studentIds, status) =>
                  markSelected.mutate({ studentIds, status })
                }
              />
            ) : null}
          </>
        )}
      </ApiState>
    </section>
  );
}
