import { Button } from "@dev-ui/components/button";
import { Drawer } from "@dev-ui/components/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { ADMIN_ROLES } from "@/lib/constants";
import { useAuth } from "@/lib/use-auth";
import { AttendanceRosterTable } from "@/modules/attendance/attendance-roster-table";
import {
  type TrialCandidate,
  TrialCandidateCombobox,
} from "@/modules/attendance/trial-candidate-combobox";
import type {
  AttendanceRosterEntry,
  AttendanceStatusValue,
} from "@/modules/attendance/types";
import { SessionScheduleActions } from "@/modules/sessions/session-schedule-actions";
import { useStudioTrainers } from "@/modules/trainers/use-trainers";
import { ApiState } from "@/modules/ui/api-state";
import { AppSheet } from "@/modules/ui/app-sheet";
import {
  DateOfBirthOrAgeFields,
  hasAgeValue,
  resolveAgePayload,
} from "@/modules/ui/date-of-birth-or-age";
import {
  ExpandableBentoGrid,
  type ExpandableBentoItem,
} from "@/modules/ui/expandable-bento-grid";
import { PageHeader } from "@/modules/ui/page-header";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./sessions.$id.attendance.module.scss";

const QR_ITEM_ID = "check-in-qr";

type Session = {
  id: string;
  batchId: string;
  startsAt: string;
  endsAt: string;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  trainerId?: string | null;
  batch?: {
    name: string;
    trainers?: Array<{ trainerId: string; sortOrder: number }>;
  };
};

type NewStudentForm = {
  name: string;
  email: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth: string;
  age: string;
  guardianName: string;
  alternateMobile: string;
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

/** Matches API + QR: marking opens 15 minutes before session start. */
const ATTENDANCE_EARLY_WINDOW_MS = 15 * 60 * 1000;

function isAttendanceMarkingOpen(startsAt: string, now = Date.now()) {
  const starts = new Date(startsAt).getTime();
  if (!Number.isFinite(starts)) return false;
  return now >= starts - ATTENDANCE_EARLY_WINDOW_MS;
}

export const Route = createFileRoute("/app/sessions/$id/attendance")({
  component: SessionAttendancePage,
});

function AddTrialUserSheet({
  sessionId,
  isOpen,
  onClose,
  onSuccess,
}: {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const api = useApi();
  const { toast } = useToastContext("AddTrialUserSheet");
  const [selectedCandidate, setSelectedCandidate] =
    useState<TrialCandidate | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStudent, setNewStudent] = useState<NewStudentForm>({
    name: "",
    email: "",
    gender: "MALE",
    dateOfBirth: "",
    age: "",
    guardianName: "",
    alternateMobile: "",
  });

  const addTrialMutation = useMutation({
    mutationFn: (studentId: string) =>
      api.post<AttendanceRosterEntry>(
        `/attendance/session/${sessionId}/add-trial`,
        { studentId },
      ),
    onSuccess: () => {
      toast({
        title: "Trial user added",
        description: "The student has been added to the roster.",
        variant: "success",
      });
      onSuccess();
      onClose();
      setSelectedCandidate(null);
      setPickerKey((key) => key + 1);
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to add trial user",
        description:
          error instanceof Error ? error.message : "Could not add trial user.",
        variant: "error",
      });
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: async (data: NewStudentForm) => {
      const student = await api.post<{ id: string }>("/users", {
        name: data.name.trim(),
        email: data.email.trim(),
        gender: data.gender,
        ...resolveAgePayload({ dateOfBirth: data.dateOfBirth, age: data.age }),
        ...(data.guardianName.trim()
          ? { guardianName: data.guardianName.trim() }
          : {}),
        ...(data.alternateMobile.trim()
          ? { alternateMobile: data.alternateMobile.trim() }
          : {}),
      });
      return student.id;
    },
    onSuccess: (studentId) => {
      addTrialMutation.mutate(studentId);
      setShowCreateForm(false);
      setNewStudent({
        name: "",
        email: "",
        gender: "MALE",
        dateOfBirth: "",
        age: "",
        guardianName: "",
        alternateMobile: "",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to create student",
        description:
          error instanceof Error ? error.message : "Could not create student.",
        variant: "error",
      });
    },
  });

  function handleCreateSubmit() {
    if (!newStudent.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a student name.",
        variant: "error",
      });
      return;
    }
    if (!newStudent.email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a student email.",
        variant: "error",
      });
      return;
    }
    if (
      !hasAgeValue({ dateOfBirth: newStudent.dateOfBirth, age: newStudent.age })
    ) {
      toast({
        title: "Age required",
        description: "Enter a date of birth or exact age.",
        variant: "error",
      });
      return;
    }
    createStudentMutation.mutate(newStudent);
  }

  return (
    <Drawer isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className={styles.trialSheet}>
        <div className={styles.trialSheetHeader}>
          <h2 className={styles.trialSheetTitle}>Add trial user</h2>
          <button
            type="button"
            className={styles.trialSheetClose}
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
        </div>

        <div className={styles.trialSheetBody}>
          {!showCreateForm ? (
            <>
              <TrialCandidateCombobox
                key={pickerKey}
                sessionId={sessionId}
                selectedKey={selectedCandidate?.id ?? null}
                onSelectionChange={setSelectedCandidate}
                isDisabled={addTrialMutation.isPending}
                isOpen={isOpen}
              />

              <TouchButton
                fullWidth
                variant="primary"
                data-testid="add-trial-confirm"
                isDisabled={!selectedCandidate || addTrialMutation.isPending}
                isPending={addTrialMutation.isPending}
                onClick={() => {
                  if (!selectedCandidate) return;
                  addTrialMutation.mutate(selectedCandidate.id);
                }}
              >
                Add to roster
              </TouchButton>

              <div className={styles.trialSheetDivider}>
                <span>or</span>
              </div>

              <TouchButton
                fullWidth
                variant="default"
                onClick={() => setShowCreateForm(true)}
                data-testid="add-trial-create"
                isDisabled={addTrialMutation.isPending}
              >
                <Icon name="plus" />
                Create new student
              </TouchButton>
            </>
          ) : (
            <div className={styles.trialCreateForm}>
              <div className={styles.trialFormField}>
                <label htmlFor="student-name" className={styles.trialFormLabel}>
                  Name <span className={styles.trialFormRequired}>*</span>
                </label>
                <input
                  id="student-name"
                  type="text"
                  value={newStudent.name}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, name: e.target.value })
                  }
                  placeholder="Student name"
                  required
                  className={styles.trialFormInput}
                />
              </div>
              <div className={styles.trialFormField}>
                <label
                  htmlFor="student-email"
                  className={styles.trialFormLabel}
                >
                  Email <span className={styles.trialFormRequired}>*</span>
                </label>
                <input
                  id="student-email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, email: e.target.value })
                  }
                  placeholder="email@example.com"
                  required
                  className={styles.trialFormInput}
                />
              </div>
              <div className={styles.trialFormField}>
                <label
                  htmlFor="student-gender"
                  className={styles.trialFormLabel}
                >
                  Gender
                </label>
                <select
                  id="student-gender"
                  value={newStudent.gender}
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      gender: e.target.value as NewStudentForm["gender"],
                    })
                  }
                  className={styles.trialFormSelect}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <DateOfBirthOrAgeFields
                dateOfBirth={newStudent.dateOfBirth}
                onDateOfBirthChange={(dateOfBirth) =>
                  setNewStudent((current) => ({ ...current, dateOfBirth }))
                }
                age={newStudent.age}
                onAgeChange={(age) =>
                  setNewStudent((current) => ({ ...current, age }))
                }
                className={styles.trialFormRow}
                hint="Enter either a date of birth or an exact age."
                required
              />
              <div className={styles.trialFormRow}>
                <div className={styles.trialFormField}>
                  <label
                    htmlFor="student-guardian"
                    className={styles.trialFormLabel}
                  >
                    Guardian name
                  </label>
                  <input
                    id="student-guardian"
                    type="text"
                    value={newStudent.guardianName}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        guardianName: e.target.value,
                      })
                    }
                    placeholder="Optional"
                    className={styles.trialFormInput}
                  />
                </div>
                <div className={styles.trialFormField}>
                  <label
                    htmlFor="student-alternate-mobile"
                    className={styles.trialFormLabel}
                  >
                    Alternate mobile
                  </label>
                  <input
                    id="student-alternate-mobile"
                    type="tel"
                    value={newStudent.alternateMobile}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        alternateMobile: e.target.value,
                      })
                    }
                    placeholder="Optional"
                    className={styles.trialFormInput}
                  />
                </div>
              </div>
              <div className={styles.trialCreateActions}>
                <TouchButton
                  variant="default"
                  onClick={() => setShowCreateForm(false)}
                  isDisabled={
                    createStudentMutation.isPending ||
                    addTrialMutation.isPending
                  }
                >
                  Cancel
                </TouchButton>
                <TouchButton
                  variant="primary"
                  onClick={handleCreateSubmit}
                  isPending={
                    createStudentMutation.isPending ||
                    addTrialMutation.isPending
                  }
                >
                  Create & add
                </TouchButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

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

const SKELETON_ROWS = [
  { id: "srow-0", title: "72%", meta: "38%" },
  { id: "srow-1", title: "58%", meta: "30%" },
  { id: "srow-2", title: "64%", meta: "34%" },
  { id: "srow-3", title: "50%", meta: "28%" },
  { id: "srow-4", title: "68%", meta: "36%" },
  { id: "srow-5", title: "54%", meta: "32%" },
] as const;

function SessionAttendanceSkeleton() {
  return (
    <div
      className={styles.skeleton}
      aria-hidden
      data-testid="attendance-skeleton"
    >
      <div className={styles.skeletonSummary}>
        {SKELETON_ROWS.slice(0, 4).map((row) => (
          <SkeletonBlock
            key={row.id}
            className={styles.skeletonChip}
            height="2rem"
            width="5.5rem"
            radius="999px"
          />
        ))}
      </div>

      <div className={styles.skeletonToolbar}>
        <SkeletonBlock
          className={styles.skeletonSearch}
          height="2.5rem"
          width="100%"
          radius="var(--radius-lg, 0.75rem)"
        />
        <div className={styles.skeletonChips}>
          {SKELETON_ROWS.slice(0, 4).map((row) => (
            <SkeletonBlock
              key={`chip-${row.id}`}
              height="1.75rem"
              width="4.5rem"
              radius="999px"
            />
          ))}
        </div>
      </div>

      <div className={styles.skeletonTable}>
        <div className={styles.skeletonTableHeader}>
          <SkeletonBlock
            className={styles.skeletonCheck}
            height="1rem"
            width="1rem"
            radius="var(--radius-sm, 0.25rem)"
          />
          <SkeletonBlock height="0.625rem" width="3.5rem" />
          <SkeletonBlock height="0.625rem" width="3.5rem" />
          <SkeletonBlock height="0.625rem" width="2.5rem" />
        </div>
        {SKELETON_ROWS.map((row) => (
          <div key={row.id} className={styles.skeletonRow}>
            <SkeletonBlock
              className={styles.skeletonCheck}
              height="1rem"
              width="1rem"
              radius="var(--radius-sm, 0.25rem)"
            />
            <div className={styles.skeletonName}>
              <SkeletonBlock height="0.9375rem" width={row.title} />
              <SkeletonBlock height="0.75rem" width={row.meta} />
            </div>
            <SkeletonBlock
              className={styles.skeletonStatus}
              height="1.25rem"
              width="4.75rem"
              radius="999px"
            />
            <SkeletonBlock
              className={styles.skeletonPills}
              height="1.75rem"
              width="10.5rem"
              radius="999px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionAttendancePage() {
  const { id } = Route.useParams();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("SessionAttendancePage");
  const { user } = useAuth();
  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;
  const trainersQuery = useStudioTrainers();
  const [activeQrId, setActiveQrId] = useState<string | null>(null);
  const [isTrialSheetOpen, setIsTrialSheetOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const qrOpen = activeQrId === QR_ITEM_ID;

  const rosterQueryKey = ["attendance-roster", id] as const;

  const sessionQuery = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.get<Session>(`/sessions/${id}`),
  });

  const firstBatchTrainerId =
    sessionQuery.data?.batch?.trainers?.[0]?.trainerId ?? null;
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(
    null,
  );
  useEffect(() => {
    setSelectedTrainerId((current) => current ?? firstBatchTrainerId);
  }, [firstBatchTrainerId]);

  const markingOpen = sessionQuery.data
    ? isAttendanceMarkingOpen(sessionQuery.data.startsAt)
    : false;
  const markingLocked = Boolean(sessionQuery.data) && !markingOpen;

  const rosterQuery = useQuery({
    queryKey: rosterQueryKey,
    queryFn: () =>
      api.get<AttendanceRosterEntry[]>(`/attendance/session/${id}/roster`),
    enabled: Boolean(id),
  });

  const qrQuery = useQuery({
    queryKey: ["session-qr", id],
    queryFn: () =>
      api.get<{ token: string; expiresAt: string }>(`/sessions/${id}/qr`),
    enabled: Boolean(id) && qrOpen && !markingLocked,
    refetchInterval: qrOpen && !markingLocked ? 60_000 : false,
  });

  function invalidateAttendance() {
    void queryClient.invalidateQueries({
      queryKey: rosterQueryKey,
    });
    void queryClient.invalidateQueries({ queryKey: ["attendance", id] });
  }

  function patchRosterStatus(
    current: AttendanceRosterEntry[] | undefined,
    studentIds: string[],
    status: AttendanceStatusValue,
  ) {
    if (!current) return current;
    const idSet = new Set(studentIds);
    return current.map((entry) => {
      if (!idSet.has(entry.studentId)) return entry;
      return {
        ...entry,
        attendance: {
          id: entry.attendance?.id ?? `optimistic-${entry.studentId}`,
          status,
          source: "TRAINER" as const,
        },
      };
    });
  }

  const markAllPresent = useMutation({
    mutationKey: ["mark-all-present", id],
    mutationFn: () =>
      api.post<{ marked: number; failed: number }>(
        `/attendance/session/${id}/mark-all-present`,
      ),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: rosterQueryKey });
      const previous =
        queryClient.getQueryData<AttendanceRosterEntry[]>(rosterQueryKey);
      const unmarkedIds =
        previous
          ?.filter((entry) => !entry.attendance)
          .map((entry) => entry.studentId) ?? [];
      queryClient.setQueryData<AttendanceRosterEntry[]>(
        rosterQueryKey,
        (current) => patchRosterStatus(current, unmarkedIds, "PRESENT"),
      );
      return { previous };
    },
    onSuccess: (data) => {
      toast({
        title: "All marked present",
        description:
          data.failed > 0
            ? `Marked ${data.marked} students present. ${data.failed} could not be marked.`
            : "Every student was marked present.",
        variant: "success",
      });
    },
    onError: (error: unknown, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(rosterQueryKey, context.previous);
      }
      toast({
        title: "Couldn’t mark all present",
        description:
          error instanceof Error
            ? error.message
            : "Could not mark all present.",
        variant: "error",
      });
    },
    onSettled: () => {
      invalidateAttendance();
    },
  });

  const markAttendance = useMutation({
    mutationKey: ["mark-attendance", id],
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
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: rosterQueryKey });
      const previousRoster =
        queryClient.getQueryData<AttendanceRosterEntry[]>(rosterQueryKey);
      const previousEntry = previousRoster?.find(
        (entry) => entry.studentId === payload.studentId,
      );
      queryClient.setQueryData<AttendanceRosterEntry[]>(
        rosterQueryKey,
        (current) =>
          patchRosterStatus(current, [payload.studentId], payload.status),
      );
      return { previousRoster, previousEntry };
    },
    onError: (error: unknown, payload, context) => {
      if (context?.previousEntry) {
        queryClient.setQueryData<AttendanceRosterEntry[]>(
          rosterQueryKey,
          (current) =>
            current?.map((entry) =>
              entry.studentId === payload.studentId
                ? context.previousEntry!
                : entry,
            ),
        );
      } else if (context?.previousRoster) {
        queryClient.setQueryData(rosterQueryKey, context.previousRoster);
      }
      toast({
        title: "Couldn’t mark attendance",
        description:
          error instanceof Error ? error.message : "Could not mark attendance.",
        variant: "error",
      });
    },
    onSettled: () => {
      if (
        queryClient.isMutating({ mutationKey: ["mark-attendance", id] }) <= 1
      ) {
        invalidateAttendance();
      }
    },
  });

  const markSelected = useMutation({
    mutationKey: ["mark-selected", id],
    mutationFn: async (payload: {
      studentIds: string[];
      status: AttendanceStatusValue;
    }) => {
      const results = await Promise.allSettled(
        payload.studentIds.map(async (studentId) => {
          await api.post("/attendance/mark", {
            sessionId: id,
            studentId,
            status: payload.status,
            source: "TRAINER",
          });
          return studentId;
        }),
      );
      const succeededIds = results
        .filter(
          (result): result is PromiseFulfilledResult<string> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);
      const failedIds = payload.studentIds.filter(
        (studentId) => !succeededIds.includes(studentId),
      );
      return {
        marked: succeededIds.length,
        failed: failedIds.length,
        failedIds,
        status: payload.status,
      };
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: rosterQueryKey });
      const previousRoster =
        queryClient.getQueryData<AttendanceRosterEntry[]>(rosterQueryKey);
      queryClient.setQueryData<AttendanceRosterEntry[]>(
        rosterQueryKey,
        (current) =>
          patchRosterStatus(current, payload.studentIds, payload.status),
      );
      return { previousRoster };
    },
    onSuccess: (data, _payload, context) => {
      if (data.failed > 0 && context?.previousRoster) {
        const failedSet = new Set(data.failedIds);
        const previousEntriesMap = new Map(
          context.previousRoster
            .filter((entry) => failedSet.has(entry.studentId))
            .map((entry) => [entry.studentId, entry]),
        );
        queryClient.setQueryData<AttendanceRosterEntry[]>(
          rosterQueryKey,
          (current) =>
            current?.map(
              (entry) => previousEntriesMap.get(entry.studentId) ?? entry,
            ),
        );
      }

      const statusLabel = data.status === "PRESENT" ? "present" : "absent";
      if (data.marked === 0 && data.failed > 0) {
        toast({
          title: "Couldn’t mark selected",
          description: `Could not mark selected students ${statusLabel}.`,
          variant: "error",
        });
      } else {
        toast({
          title:
            data.failed > 0
              ? "Attendance partially updated"
              : "Attendance updated",
          description:
            data.failed > 0
              ? `Marked ${data.marked} students ${statusLabel}. ${data.failed} could not be marked.`
              : `Selected students were marked ${statusLabel}.`,
          variant: data.failed > 0 ? "warning" : "success",
        });
      }
    },
    onError: (error: unknown, _vars, context) => {
      if (context?.previousRoster) {
        queryClient.setQueryData(rosterQueryKey, context.previousRoster);
      }
      toast({
        title: "Couldn’t mark selected",
        description:
          error instanceof Error
            ? error.message
            : "Could not mark selected students.",
        variant: "error",
      });
    },
    onSettled: () => {
      invalidateAttendance();
    },
  });

  const completeSession = useMutation({
    mutationFn: () =>
      api.patch(
        `/sessions/${id}/complete`,
        isAdmin && selectedTrainerId
          ? { trainerId: selectedTrainerId }
          : undefined,
      ),
    onSuccess: async () => {
      setCompleteConfirmOpen(false);
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
    onError: (error: unknown) => {
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
        sessionQuery.data.status === "COMPLETED" && sessionQuery.data.trainerId
          ? `Instructor: ${
              trainersQuery.data?.find(
                (trainer) => trainer.id === sessionQuery.data?.trainerId,
              )?.name ?? "Trainer"
            }`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Mark attendance for enrolled students.";

  const isBulkBusy =
    markAllPresent.isPending ||
    markSelected.isPending ||
    completeSession.isPending;

  const markQueueRef = useRef(new Map<string, Promise<void>>());

  const handleMarkOne = useCallback(
    (studentId: string, status: AttendanceStatusValue) => {
      const previous = markQueueRef.current.get(studentId) ?? Promise.resolve();
      const next = previous.then(async () => {
        try {
          await markAttendance.mutateAsync({ studentId, status });
        } catch {
          return undefined;
        }
      });
      markQueueRef.current.set(studentId, next);
    },
    [markAttendance],
  );

  const handleMarkSelected = useCallback(
    (studentIds: string[], status: AttendanceStatusValue) => {
      markSelected.mutate({ studentIds, status });
    },
    [markSelected],
  );

  const handleMarkAllUnmarkedPresent = useCallback(() => {
    markAllPresent.mutate();
  }, [markAllPresent]);

  const bulkError =
    markAllPresent.error ?? markSelected.error ?? completeSession.error;
  const bulkResult = markSelected.data ?? markAllPresent.data;

  const canComplete = sessionQuery.data?.status === "SCHEDULED";

  const qrExpiresLabel = qrQuery.data
    ? formatSessionDateTime(qrQuery.data.expiresAt)
    : "session end";

  const qrItem: ExpandableBentoItem = {
    id: QR_ITEM_ID,
    title: "Check-in QR",
    subtitle: "Student self check-in",
    description: markingLocked
      ? `QR opens 15 minutes before class (${formatSessionDateTime(sessionQuery.data?.startsAt ?? "")}).`
      : `Students scan this code to check in. Valid until ${qrExpiresLabel}.`,
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
        {markingLocked
          ? "Check-in QR is unavailable until closer to session start."
          : qrQuery.isError
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
            {sessionQuery.data ? (
              <SessionScheduleActions
                menuTestId="attendance-session-actions"
                session={{
                  id: sessionQuery.data.id,
                  batchId: sessionQuery.data.batchId,
                  startsAt: sessionQuery.data.startsAt,
                  endsAt: sessionQuery.data.endsAt,
                  status: sessionQuery.data.status,
                }}
                onChanged={() => {
                  void sessionQuery.refetch();
                }}
                onDeleted={() => {
                  const batchId = sessionQuery.data?.batchId;
                  if (!batchId) return;
                  void navigate({
                    to: "/app/batches/$id",
                    params: { id: batchId },
                  });
                }}
              />
            ) : null}
            {canComplete && markingOpen ? (
              <Button
                variant="default"
                isPending={completeSession.isPending}
                data-testid="complete-session"
                onClick={() => setCompleteConfirmOpen(true)}
              >
                Complete session
              </Button>
            ) : null}
            <Button
              variant="default"
              onClick={() => setIsTrialSheetOpen(true)}
              data-testid="add-trial-user"
            >
              <Icon name="plus" />
              Add trial user
            </Button>
            <Button
              variant="primary"
              onClick={() => setActiveQrId(QR_ITEM_ID)}
              isDisabled={markingLocked}
            >
              Generate QR
            </Button>
          </div>
        }
      />

      {markingLocked && sessionQuery.data ? (
        <p
          className={styles.futureNotice}
          role="status"
          data-testid="attendance-future-notice"
        >
          Attendance opens 15 minutes before this session (
          {formatSessionDateTime(sessionQuery.data.startsAt)}). You can review
          the roster now.
        </p>
      ) : null}

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
        emptyTitle="No enrolled students"
        emptyDescription="Enroll students in this batch before taking attendance."
        loadingFallback={<SessionAttendanceSkeleton />}
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
                isBusy={isBulkBusy}
                markingDisabled={markingLocked}
                unmarkedCount={summary.unmarked}
                onMarkAllUnmarkedPresent={handleMarkAllUnmarkedPresent}
                onMarkOne={handleMarkOne}
                onMarkSelected={handleMarkSelected}
              />
            ) : null}
          </>
        )}
      </ApiState>

      <AddTrialUserSheet
        sessionId={id}
        isOpen={isTrialSheetOpen}
        onClose={() => setIsTrialSheetOpen(false)}
        onSuccess={() => {
          invalidateAttendance();
        }}
      />

      <AppSheet
        isOpen={completeConfirmOpen}
        onOpenChange={setCompleteConfirmOpen}
        title="Complete session"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Mark this session as completed? Attendance can still be reviewed
            afterward.
          </p>
          {isAdmin ? (
            <div className={styles.trainerField}>
              <Select
                label="Instructor"
                selectedKey={selectedTrainerId}
                onSelectionChange={(key) =>
                  setSelectedTrainerId(key == null ? null : String(key))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {trainersQuery.data?.map((trainer) => (
                    <SelectItem
                      key={trainer.id}
                      id={trainer.id}
                      textValue={trainer.name}
                    >
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="primary"
              fullWidth
              isPending={completeSession.isPending}
              isDisabled={isAdmin && !selectedTrainerId}
              data-testid="confirm-complete-session"
              onClick={() => completeSession.mutate()}
            >
              Complete session
            </TouchButton>
            <TouchButton
              variant="quiet"
              fullWidth
              isDisabled={completeSession.isPending}
              onClick={() => setCompleteConfirmOpen(false)}
            >
              Cancel
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </section>
  );
}
