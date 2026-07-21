import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dev-ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef } from "react";
import { useApi } from "@/lib/api-context";
import { ApiState } from "@/modules/ui/api-state";
import { PageHeader } from "@/modules/ui/page-header";
import styles from "./sessions.$id.attendance.module.scss";

type Session = {
  id: string;
  batchId: string;
  startsAt: string;
  endsAt: string;
  batch?: { name: string };
};

type RosterEntry = {
  studentId: string;
  student: { name: string };
  attendance: {
    id: string;
    status: "PRESENT" | "ABSENT";
    source: "TRAINER" | "DESK" | "QR";
  } | null;
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

function attendanceSourceLabel(source: "TRAINER" | "DESK" | "QR") {
  if (source === "QR") return "Checked in via QR";
  if (source === "DESK") return "Marked at desk";
  return "Marked by trainer";
}

export const Route = createFileRoute("/app/sessions/$id/attendance")({
  component: SessionAttendancePage,
});

function QrCanvas({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !token) return;
    void QRCode.toCanvas(canvasRef.current, token, {
      width: 240,
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

  const sessionQuery = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.get<Session>(`/sessions/${id}`),
  });

  const rosterQuery = useQuery({
    queryKey: ["attendance-roster", id],
    queryFn: () => api.get<RosterEntry[]>(`/attendance/session/${id}/roster`),
    enabled: Boolean(id),
  });

  const qrQuery = useQuery({
    queryKey: ["session-qr", id],
    queryFn: () =>
      api.get<{ token: string; expiresAt: string }>(`/sessions/${id}/qr`),
    enabled: Boolean(id),
    refetchInterval: 60_000,
  });

  const markAllPresent = useMutation({
    mutationFn: () =>
      api.post<{ marked: number; failed: number }>(
        `/attendance/session/${id}/mark-all-present`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["attendance-roster", id],
      });
      void queryClient.invalidateQueries({ queryKey: ["attendance", id] });
    },
  });

  const markAttendance = useMutation({
    mutationFn: (payload: {
      studentId: string;
      status: "PRESENT" | "ABSENT";
      source?: "TRAINER" | "DESK";
    }) =>
      api.post("/attendance/mark", {
        sessionId: id,
        studentId: payload.studentId,
        status: payload.status,
        source: payload.source ?? "TRAINER",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["attendance-roster", id],
      });
      void queryClient.invalidateQueries({ queryKey: ["attendance", id] });
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

  return (
    <section className={`page ${styles.root}`}>
      <PageHeader title="Session attendance" description={sessionDescription} />

      <Card className={styles.qrCard}>
        <CardHeader>
          <CardTitle>Check-in QR</CardTitle>
          <CardDescription>
            Students scan this code to check in. Valid until{" "}
            {qrQuery.data
              ? formatSessionDateTime(qrQuery.data.expiresAt)
              : "session end"}
            .
          </CardDescription>
        </CardHeader>
        <CardContent className={styles.qrContent}>
          {qrQuery.data?.token ? (
            <>
              <QrCanvas token={qrQuery.data.token} />
              <p className={styles.qrHint}>
                Display this at the front desk or projector for self check-in.
              </p>
            </>
          ) : (
            <p className={styles.qrHint}>
              {qrQuery.isLoading
                ? "Loading QR code…"
                : "QR code unavailable for this session."}
            </p>
          )}
        </CardContent>
      </Card>

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
                <div className={styles.summary}>
                  <Badge variant="neutral">{summary.total} enrolled</Badge>
                  <Badge variant="success">{summary.present} present</Badge>
                  <Badge variant="danger">{summary.absent} absent</Badge>
                  {summary.unmarked > 0 ? (
                    <Badge variant="warning">{summary.unmarked} unmarked</Badge>
                  ) : null}
                </div>
                {summary.unmarked > 0 ? (
                  <Button
                    variant="primary"
                    isDisabled={
                      markAllPresent.isPending || markAttendance.isPending
                    }
                    onClick={() => markAllPresent.mutate()}
                  >
                    {markAllPresent.isPending
                      ? "Marking…"
                      : `Mark all present (${summary.unmarked})`}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {markAllPresent.isError ? (
              <p className={styles.bulkError} role="alert">
                {markAllPresent.error instanceof Error
                  ? markAllPresent.error.message
                  : "Could not mark all students present."}
              </p>
            ) : null}

            {markAllPresent.data && markAllPresent.data.failed > 0 ? (
              <p className={styles.bulkWarning} role="status">
                Marked {markAllPresent.data.marked} students present.{" "}
                {markAllPresent.data.failed} could not be marked — check
                subscriptions and try again individually.
              </p>
            ) : null}

            <div className={styles.roster}>
              {roster.map((entry) => {
                const status = entry.attendance?.status ?? null;
                const isPending =
                  markAllPresent.isPending ||
                  (markAttendance.isPending &&
                    markAttendance.variables?.studentId === entry.studentId);

                return (
                  <Card key={entry.studentId}>
                    <CardContent className={styles.studentRow}>
                      <div className={styles.studentHeader}>
                        <div className={styles.studentMeta}>
                          <p className={styles.studentName}>
                            {entry.student.name}
                          </p>
                          <p className={styles.studentStatus}>
                            {status === "PRESENT"
                              ? attendanceSourceLabel(entry.attendance!.source)
                              : status === "ABSENT"
                                ? "Marked absent"
                                : "Not marked yet"}
                          </p>
                        </div>
                        {status ? (
                          <Badge
                            variant={
                              status === "PRESENT" ? "success" : "danger"
                            }
                          >
                            {status === "PRESENT" ? "Present" : "Absent"}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Unmarked</Badge>
                        )}
                      </div>
                      <div className={styles.actions}>
                        <Button
                          variant={status === "PRESENT" ? "primary" : "default"}
                          isDisabled={isPending || markAllPresent.isPending}
                          onClick={() =>
                            markAttendance.mutate({
                              studentId: entry.studentId,
                              status: "PRESENT",
                            })
                          }
                        >
                          Present
                        </Button>
                        <Button
                          variant={status === "ABSENT" ? "primary" : "default"}
                          isDisabled={isPending || markAllPresent.isPending}
                          onClick={() =>
                            markAttendance.mutate({
                              studentId: entry.studentId,
                              status: "ABSENT",
                            })
                          }
                        >
                          Absent
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </ApiState>
    </section>
  );
}
