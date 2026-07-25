import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { Checkbox } from "@dev-ui/components/checkbox";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import {
  StudentSearchCombobox,
  type StudioStudent,
} from "@/modules/students/student-search-combobox";
import { StyleList } from "@/modules/styles/style-list";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PressableCard } from "@/modules/ui/pressable-card";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./batch-roster.module.scss";

export type BatchEnrollmentRow = {
  studentId: string;
  isTrial?: boolean;
  trialSessionIds?: string[] | null;
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudioStudent | null>(
    null,
  );
  const [isTrial, setIsTrial] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [rosterFilter, setRosterFilter] =
    useState<RosterEnrollmentFilter>("all");

  const query = useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => api.get<BatchWithEnrollments>(`/batches/${batchId}`),
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
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["batch", batchId], context.previous);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
        queryClient.invalidateQueries({
          queryKey: ["studio-students-search"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-profile", STUDIO_ID],
        }),
      ]);
    },
  });

  function handleSelect(student: StudioStudent | null) {
    setSelectedStudent(student);
    setStudentId(student?.id ?? null);
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

      <div className={staff.softPanel}>
        <div className={styles.enrollForm}>
          <StudentSearchCombobox
            key={pickerKey}
            label="Add student"
            selectedKey={studentId}
            onSelectionChange={handleSelect}
            excludeIds={enrolledIds}
            isDisabled={!active || isFull}
            placeholder="Search student to enroll"
          />
          <TouchButton
            variant="primary"
            isDisabled={
              !active || isFull || (!selectedStudent && !enroll.isPending)
            }
            isPending={enroll.isPending}
            onClick={() => {
              if (selectedStudent) {
                enroll.mutate({ student: selectedStudent, isTrial });
              }
            }}
          >
            Enroll
          </TouchButton>
        </div>
        <Checkbox
          isSelected={isTrial}
          isDisabled={!active || isFull}
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
              <PressableCard
                key={row.studentId}
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
                      <AvatarImage src={student.photoUrl} alt={student.name} />
                    ) : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className={styles.body}>
                    <div className={styles.top}>
                      <h3 className={styles.name}>{student.name}</h3>
                      {row.isTrial ? (
                        <Badge appearance="subtle">
                          {`Trial · ${row.trialSessionIds?.length ?? 0}/2`}
                        </Badge>
                      ) : (
                        <Badge appearance="subtle">Enrolled</Badge>
                      )}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
