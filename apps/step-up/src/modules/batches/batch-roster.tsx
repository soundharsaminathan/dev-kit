import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { Menu } from "@dev-ui/components/menu";
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
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useStudioId } from "@/lib/use-studio-id";
import { formatPrice } from "@/modules/payments/invoice-types";
import {
  StudentSearchCombobox,
  type StudioStudent,
} from "@/modules/students/student-search-combobox";
import { PressableCard } from "@/modules/ui/pressable-card";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { upcomingSessions } from "./batch-overview-helpers";
import styles from "./batch-roster.module.scss";

export type BatchEnrollmentRow = {
  studentId: string;
  monthlyUnpaid?: boolean;
  paidMonths?: number;
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
    styles?: string[];
    createdAt?: string;
  };
};

function formatPaidMonths(months: number) {
  return `${months} ${months === 1 ? "month" : "months"}`;
}

type BatchPlan = {
  id: string;
  name: string;
  price: number;
  billingCadence: string;
  kind: "INDIVIDUAL" | "FAMILY";
  active: boolean;
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
  plans?: BatchPlan[];
  enrollments: BatchEnrollmentRow[];
  sessions?: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status?: string;
  }>;
};

function planLabel(plan: BatchPlan) {
  const cadence =
    plan.billingCadence.charAt(0) +
    plan.billingCadence.slice(1).toLowerCase().replaceAll("_", " ");
  return `${plan.name} · ${formatPrice(plan.price)} / ${cadence}`;
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
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

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
  const enrolledIds = useMemo(
    () => enrollments.map((row) => row.studentId),
    [enrollments],
  );
  const plans = useMemo(
    () =>
      (query.data?.plans ?? []).filter(
        (plan) => plan.active && plan.kind === "INDIVIDUAL",
      ),
    [query.data?.plans],
  );
  const seatsTaken = query.data?.enrollmentCount ?? enrollments.length;
  const seatsLeft =
    query.data?.remainingSeats ?? Math.max(0, capacity - seatsTaken);
  const isFull = seatsLeft <= 0;
  const hasUpcomingSessions =
    !query.isLoading && upcomingSessions(query.data?.sessions).length > 0;
  const hasPlans = plans.length > 0;
  const canEnroll = active && !isFull && hasUpcomingSessions && hasPlans;

  const enroll = useMutation({
    mutationFn: (input: { student: StudioStudent; subscriptionId: string }) =>
      api.post(`/batches/${batchId}/enroll`, {
        studentId: input.student.id,
        subscriptionId: input.subscriptionId,
      }),
    onMutate: async ({ student }) => {
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
                monthlyUnpaid: true,
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
      setSubscriptionId(null);
      setPickerKey((current) => current + 1);

      return { previous };
    },
    onSuccess: () => {
      toast({
        title: "Student enrolled",
        description: "Invoice created. Collect payment from Invoices.",
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
        queryClient.invalidateQueries({
          queryKey: ["invoices", studioId],
        }),
      ]);
    },
  });

  function handleEnrollAction() {
    if (!selectedStudent || !subscriptionId || !canEnroll) return;
    enroll.mutate({
      student: selectedStudent,
      subscriptionId,
    });
  }

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
            <Select
              label="Package"
              placeholder={
                hasPlans ? "Select a package" : "No packages on this batch"
              }
              value={subscriptionId}
              onChange={(key) =>
                setSubscriptionId(key == null ? null : String(key))
              }
              isDisabled={!hasPlans || !active || isFull}
            >
              <SelectTrigger data-testid="enroll-package">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem
                    key={plan.id}
                    id={plan.id}
                    textValue={planLabel(plan)}
                  >
                    {planLabel(plan)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Menu>
              <TouchButton
                variant="primary"
                isDisabled={
                  !canEnroll ||
                  !selectedStudent ||
                  !subscriptionId ||
                  enroll.isPending
                }
                isPending={enroll.isPending}
                data-testid="enroll-button"
                onClick={handleEnrollAction}
              >
                Enroll
              </TouchButton>
            </Menu>
          </div>
          {!hasPlans ? (
            <p className={styles.hint}>
              Attach at least one individual package to this batch before
              enrolling students.
            </p>
          ) : null}
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
          description="Search for a student and pick a package to enroll."
        />
      ) : (
        <div className={styles.list}>
          {enrollments.map((row) => {
            const student = row.student;
            const initials = student.name.slice(0, 1).toUpperCase();
            const paidMonths = row.paidMonths ?? 0;

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
                    </div>

                    <p
                      className={styles.tenure}
                      data-testid={`paid-months-${row.studentId}`}
                    >
                      <Icon name="wallet" className={styles.tenureIcon} />
                      {formatPaidMonths(paidMonths)}
                    </p>
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
