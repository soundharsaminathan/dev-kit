import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { Checkbox } from "@dev-ui/components/checkbox";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useStudioId } from "@/lib/use-studio-id";
import {
  StudentSearchCombobox,
  type StudioStudent,
} from "@/modules/students/student-search-combobox";
import { StyleList } from "@/modules/styles/style-list";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PressableCard } from "@/modules/ui/pressable-card";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { upcomingSessions } from "./batch-overview-helpers";
import styles from "./batch-roster.module.scss";

export type BatchEnrollmentRow = {
  studentId: string;
  isTrial?: boolean;
  trialSessionIds?: string[] | null;
  monthlyUnpaid?: boolean;
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
    styles?: string[];
  };
};

type BatchRosterProps = {
  batchId: string;
  capacity: number;
  active: boolean;
};

type BatchWithEnrollments = {
  id: string;
  capacity: number;
  active: boolean;
  enrollmentCount?: number;
  remainingSeats?: number;
  enrollments: BatchEnrollmentRow[];
  sessions?: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status?: string;
  }>;
};

type SwitchTarget = {
  id: string;
  name: string;
  category: string;
  remainingSeats: number;
  branchName: string;
};

type SwitchTargetsResponse = {
  studentId: string;
  isTrial: boolean;
  subscription: { id: string; name: string } | null;
  reason?: string;
  targets: SwitchTarget[];
};

export type RosterEnrollmentFilter = "all" | "trial" | "enrolled";

export function filterRosterEnrollments(
  rows: BatchEnrollmentRow[],
  filter: RosterEnrollmentFilter,
) {
  if (filter === "trial") {
    return rows.filter((row) => row.isTrial === true);
  }
  if (filter === "enrolled") {
    return rows.filter((row) => row.isTrial !== true);
  }
  return rows;
}

export function BatchRoster({ batchId, capacity, active }: BatchRosterProps) {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BatchRoster");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudioStudent | null>(
    null,
  );
  const [isTrial, setIsTrial] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [rosterFilter, setRosterFilter] =
    useState<RosterEnrollmentFilter>("all");
  const [switchStudent, setSwitchStudent] = useState<BatchEnrollmentRow | null>(
    null,
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => api.get<BatchWithEnrollments>(`/batches/${batchId}`),
  });

  const switchTargetsQuery = useQuery({
    queryKey: ["batch-switch-targets", batchId, switchStudent?.studentId],
    queryFn: () =>
      api.get<SwitchTargetsResponse>(
        `/batches/${batchId}/switch-targets?studentId=${encodeURIComponent(switchStudent!.studentId)}`,
      ),
    enabled: switchStudent != null,
  });

  const enrollments = useMemo(() => {
    const rows = query.data?.enrollments ?? [];
    return [...rows].sort((a, b) =>
      a.student.name.localeCompare(b.student.name),
    );
  }, [query.data?.enrollments]);
  const trialCount = useMemo(
    () => enrollments.filter((row) => row.isTrial === true).length,
    [enrollments],
  );
  const memberCount = enrollments.length - trialCount;
  const filteredEnrollments = useMemo(
    () => filterRosterEnrollments(enrollments, rosterFilter),
    [enrollments, rosterFilter],
  );
  const enrolledIds = useMemo(
    () => enrollments.map((row) => row.studentId),
    [enrollments],
  );
  const seatsTaken = query.data?.enrollmentCount ?? enrollments.length;
  const seatsLeft =
    query.data?.remainingSeats ?? Math.max(0, capacity - seatsTaken);
  const isFull = seatsLeft <= 0;
  const hasUpcomingSessions =
    !query.isLoading && upcomingSessions(query.data?.sessions).length > 0;
  const canEnroll = active && !isFull && hasUpcomingSessions;

  const filterChips = useMemo(
    () => [
      { id: "all", label: `All (${enrollments.length})` },
      { id: "trial", label: `Trial (${trialCount})` },
      { id: "enrolled", label: `Members (${memberCount})` },
    ],
    [enrollments.length, trialCount, memberCount],
  );

  const enroll = useMutation({
    mutationFn: (input: { student: StudioStudent; isTrial: boolean }) =>
      api.post(`/batches/${batchId}/enroll`, {
        studentId: input.student.id,
        isTrial: input.isTrial,
      }),
    onMutate: async ({ student, isTrial: enrollAsTrial }) => {
      await queryClient.cancelQueries({ queryKey: ["batch", batchId] });

      const previous = queryClient.getQueryData<BatchWithEnrollments>([
        "batch",
        batchId,
      ]);

      queryClient.setQueryData<BatchWithEnrollments>(
        ["batch", batchId],
        (current) => {
          if (!current) return current;
          if (current.enrollments.some((row) => row.studentId === student.id)) {
            return current;
          }
          const enrollmentCount =
            (current.enrollmentCount ?? current.enrollments.length) + 1;
          return {
            ...current,
            enrollmentCount,
            remainingSeats: Math.max(0, current.capacity - enrollmentCount),
            enrollments: [
              {
                studentId: student.id,
                isTrial: enrollAsTrial,
                trialSessionIds: enrollAsTrial ? [] : null,
                student: {
                  id: student.id,
                  name: student.name,
                  email: student.email,
                  phone: student.phone ?? null,
                  photoUrl: null,
                  styles: [],
                },
              },
              ...current.enrollments,
            ],
          };
        },
      );

      setStudentId(null);
      setSelectedStudent(null);
      setIsTrial(false);
      setPickerKey((current) => current + 1);

      return { previous };
    },
    onSuccess: (_data, { isTrial: enrolledAsTrial }) => {
      toast({
        title: "Student enrolled",
        description: enrolledAsTrial
          ? "They were added on a trial seat."
          : "They were added to this batch.",
        variant: "success",
      });
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["batch", batchId], context.previous);
      }
      toast({
        title: "Couldn’t enroll student",
        description:
          error instanceof Error ? error.message : "Could not enroll student.",
        variant: "error",
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
        queryClient.invalidateQueries({
          queryKey: ["studio-students-search", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-profile", studioId],
        }),
      ]);
    },
  });

  const switchBatch = useMutation({
    mutationFn: (input: { studentId: string; toBatchId: string }) =>
      api.post(`/batches/${batchId}/switch`, {
        studentId: input.studentId,
        toBatchId: input.toBatchId,
      }),
    onMutate: async ({ studentId: movingStudentId, toBatchId }) => {
      await queryClient.cancelQueries({ queryKey: ["batch", batchId] });
      const previous = queryClient.getQueryData<BatchWithEnrollments>([
        "batch",
        batchId,
      ]);

      queryClient.setQueryData<BatchWithEnrollments>(
        ["batch", batchId],
        (current) => {
          if (!current) return current;
          const nextEnrollments = current.enrollments.filter(
            (row) => row.studentId !== movingStudentId,
          );
          const enrollmentCount = nextEnrollments.length;
          return {
            ...current,
            enrollmentCount,
            remainingSeats: Math.max(0, current.capacity - enrollmentCount),
            enrollments: nextEnrollments,
          };
        },
      );

      return { previous, toBatchId };
    },
    onSuccess: (_data, { toBatchId }) => {
      const targetName =
        switchTargetsQuery.data?.targets.find((t) => t.id === toBatchId)
          ?.name ?? "the new batch";
      toast({
        title: "Batch switched",
        description: `Moved to ${targetName}.`,
        variant: "success",
      });
      setSwitchStudent(null);
      setSelectedTargetId(null);
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["batch", batchId], context.previous);
      }
      toast({
        title: "Couldn’t switch batch",
        description:
          error instanceof Error ? error.message : "Could not switch batch.",
        variant: "error",
      });
    },
    onSettled: async (_data, _error, variables, context) => {
      const invalidate = [
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
        queryClient.invalidateQueries({
          queryKey: ["student-profile", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["batches", studioId],
        }),
      ];
      if (context?.toBatchId ?? variables.toBatchId) {
        invalidate.push(
          queryClient.invalidateQueries({
            queryKey: ["batch", context?.toBatchId ?? variables.toBatchId],
          }),
        );
      }
      await Promise.all(invalidate);
    },
  });

  function handleSelect(student: StudioStudent | null) {
    setSelectedStudent(student);
    setStudentId(student?.id ?? null);
  }

  function openSwitch(row: BatchEnrollmentRow) {
    setSwitchStudent(row);
    setSelectedTargetId(null);
  }

  function closeSwitch() {
    setSwitchStudent(null);
    setSelectedTargetId(null);
  }

  if (query.isError) {
    return (
      <ErrorState
        description={
          query.error instanceof Error
            ? query.error.message
            : "Could not load students."
        }
        action={
          <TouchButton variant="primary" onClick={() => query.refetch()}>
            Try again
          </TouchButton>
        }
      />
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <Badge variant="neutral">
          {seatsTaken}/{capacity} enrolled
        </Badge>
        {isFull ? <Badge variant="danger">Full</Badge> : null}
        {!active ? <Badge variant="neutral">Inactive</Badge> : null}
      </div>

      {enrollments.length > 0 ? (
        <div className={styles.filters}>
          <FilterChipRow
            chips={filterChips}
            selected={[rosterFilter]}
            onToggle={(id) => setRosterFilter(id as RosterEnrollmentFilter)}
          />
        </div>
      ) : null}

      {!query.isLoading && !hasUpcomingSessions ? (
        <div className={staff.softPanel}>
          <p className={styles.hint}>
            No upcoming sessions — enrollment is closed until this batch has a
            next class on the schedule.
          </p>
        </div>
      ) : hasUpcomingSessions ? (
        <div className={staff.softPanel}>
          <div className={styles.enrollForm}>
            <StudentSearchCombobox
              key={pickerKey}
              label="Add student"
              selectedKey={studentId}
              onSelectionChange={handleSelect}
              excludeIds={enrolledIds}
              isDisabled={!canEnroll}
              placeholder="Search student to enroll"
            />
            <TouchButton
              variant="primary"
              isDisabled={!canEnroll || (!selectedStudent && !enroll.isPending)}
              isPending={enroll.isPending}
              onClick={() => {
                if (selectedStudent && canEnroll) {
                  enroll.mutate({ student: selectedStudent, isTrial });
                }
              }}
            >
              Enroll
            </TouchButton>
          </div>
          <Checkbox
            isSelected={isTrial}
            isDisabled={!canEnroll}
            onChange={setIsTrial}
          >
            Trial (next 2 sessions)
          </Checkbox>
          {!active ? (
            <p className={styles.hint}>
              Activate this batch before enrolling students.
            </p>
          ) : null}
          {active && isFull ? (
            <p className={styles.hint}>
              Batch is at capacity. Increase capacity to add more students.
            </p>
          ) : null}
          {enroll.isError ? (
            <p className={styles.error}>
              {enroll.error instanceof Error
                ? enroll.error.message
                : "Could not enroll student."}
            </p>
          ) : null}
          {selectedStudent ? (
            <p className={styles.hint}>{selectedStudent.email}</p>
          ) : null}
        </div>
      ) : null}

      {enrollments.length === 0 ? (
        <EmptyState
          icon={ENTITY_ICONS.student}
          title="No students enrolled"
          description="Search for a student above to add them to this batch."
        />
      ) : filteredEnrollments.length === 0 ? (
        <EmptyState
          icon={ENTITY_ICONS.student}
          title={
            rosterFilter === "trial" ? "No trial students" : "No full members"
          }
          description={
            rosterFilter === "trial"
              ? "Nobody on a trial seat in this batch right now."
              : "Everyone currently enrolled is on a trial."
          }
        />
      ) : (
        <div className={styles.list}>
          {filteredEnrollments.map((row) => {
            const student = row.student;
            const initials = student.name.slice(0, 1).toUpperCase();
            const styleList = student.styles ?? [];

            return (
              <div key={row.studentId} className={styles.row}>
                <PressableCard
                  className={styles.rowMain}
                  onClick={() =>
                    void navigate({
                      to: "/app/students/$id",
                      params: { id: row.studentId },
                    })
                  }
                >
                  <div className={styles.card}>
                    <Avatar size="lg" className={styles.avatar}>
                      {student.photoUrl ? (
                        <AvatarImage
                          src={student.photoUrl}
                          alt={student.name}
                        />
                      ) : null}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className={styles.body}>
                      <div className={styles.top}>
                        <h3 className={styles.name}>{student.name}</h3>
                        <div className={styles.badges}>
                          {row.isTrial ? (
                            <Badge appearance="subtle">
                              {`Trial · ${row.trialSessionIds?.length ?? 0}/2`}
                            </Badge>
                          ) : (
                            <Badge appearance="subtle">Enrolled</Badge>
                          )}
                          {row.monthlyUnpaid ? (
                            <Badge appearance="subtle" variant="warning">
                              Not paid
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className={styles.contacts}>
                        <span className={styles.contact}>
                          <Icon name="mail" className={styles.contactIcon} />
                          <span className={styles.contactText}>
                            {student.email}
                          </span>
                        </span>
                        {student.phone ? (
                          <span className={styles.contact}>
                            <Icon name="user" className={styles.contactIcon} />
                            <span className={styles.contactText}>
                              {student.phone}
                            </span>
                          </span>
                        ) : null}
                      </div>

                      {styleList.length > 0 ? (
                        <StyleList styles={styleList} size="xs" />
                      ) : null}
                    </div>

                    <Icon name="chevron-right" className={styles.chevron} />
                  </div>
                </PressableCard>

                <TouchButton
                  size="sm"
                  variant="default"
                  className={styles.switchBtn}
                  data-testid={`switch-batch-${row.studentId}`}
                  onClick={() => openSwitch(row)}
                >
                  Switch
                </TouchButton>
              </div>
            );
          })}
        </div>
      )}

      <AppSheet
        isOpen={switchStudent != null}
        onOpenChange={(open) => {
          if (!open) closeSwitch();
        }}
        title={
          switchStudent
            ? `Switch batch · ${switchStudent.student.name}`
            : "Switch batch"
        }
      >
        <div className={staff.sheetStack}>
          {switchTargetsQuery.data?.subscription ? (
            <p className={staff.rowMeta}>
              Plan: {switchTargetsQuery.data.subscription.name}
            </p>
          ) : null}
          {switchTargetsQuery.isLoading ? (
            <p className={staff.rowMeta}>Loading batches…</p>
          ) : null}
          {switchTargetsQuery.isError ? (
            <ErrorState
              description={
                switchTargetsQuery.error instanceof Error
                  ? switchTargetsQuery.error.message
                  : "Could not load target batches."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => switchTargetsQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}
          {switchTargetsQuery.data &&
          switchTargetsQuery.data.targets.length === 0 ? (
            <EmptyState
              title="No eligible batches"
              description={
                switchTargetsQuery.data.reason ??
                (switchTargetsQuery.data.isTrial
                  ? "No other active batches in this category have open seats."
                  : "No other batches offer this student’s current plan with open seats.")
              }
            />
          ) : null}
          {switchTargetsQuery.data &&
          switchTargetsQuery.data.targets.length > 0 ? (
            <div className={staff.list}>
              {switchTargetsQuery.data.targets.map((target) => {
                const selected = selectedTargetId === target.id;
                return (
                  <button
                    key={target.id}
                    type="button"
                    className={`${staff.attentionCard} ${styles.targetPick}`}
                    data-selected={selected ? "true" : undefined}
                    data-testid={`switch-target-${target.id}`}
                    onClick={() => setSelectedTargetId(target.id)}
                  >
                    <div className={staff.attentionTop}>
                      <span className={staff.attentionTitle}>
                        {target.name}
                      </span>
                      <Badge variant={selected ? "success" : "neutral"}>
                        {selected
                          ? "Selected"
                          : `${target.remainingSeats} left`}
                      </Badge>
                    </div>
                    <p className={staff.attentionMeta}>
                      {target.branchName} ·{" "}
                      {target.category === "KIDS" ? "Kids" : "Adults"}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : null}
          {switchBatch.isError ? (
            <ErrorState
              description={
                switchBatch.error instanceof Error
                  ? switchBatch.error.message
                  : "Could not switch batch."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!selectedTargetId || !switchStudent}
              isPending={switchBatch.isPending}
              data-testid="confirm-switch-batch"
              onClick={() => {
                if (switchStudent && selectedTargetId) {
                  switchBatch.mutate({
                    studentId: switchStudent.studentId,
                    toBatchId: selectedTargetId,
                  });
                }
              }}
            >
              Confirm switch
            </TouchButton>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={switchBatch.isPending}
              onClick={closeSwitch}
            >
              Cancel
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </div>
  );
}
