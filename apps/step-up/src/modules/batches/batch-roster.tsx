import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { type Page, unwrapPage } from "@/lib/api-page";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { formatPaidMonths } from "@/lib/format-paid-months";
import { useStudioId } from "@/lib/use-studio-id";
import { formatPrice } from "@/modules/payments/invoice-types";
import type { StudioStudent } from "@/modules/students/student-search-combobox";
import { StudentSearchMultiselect } from "@/modules/students/student-search-multiselect";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { PressableCard } from "@/modules/ui/pressable-card";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { BatchAttendanceTab } from "./batch-attendance-tab";
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

export type InactiveEnrollmentRow = BatchEnrollmentRow & {
  endReason?: string | null;
  endedAt?: string | null;
  inactiveReason: "MOVED" | "UNENROLLED";
};

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

type BatchHeader = {
  id: string;
  capacity: number;
  active: boolean;
  enrollmentCount?: number;
  remainingSeats?: number;
  plans?: BatchPlan[];
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

function inactiveChipLabel(reason: InactiveEnrollmentRow["inactiveReason"]) {
  return reason === "MOVED" ? "Moved" : "Unenrolled";
}

export function BatchRoster({ batchId, capacity, active }: BatchRosterProps) {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BatchRoster");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [rosterTab, setRosterTab] = useState<
    "active" | "inactive" | "attendance"
  >("active");
  const [enrollStudentIds, setEnrollStudentIds] = useState<string[]>([]);
  const [enrollStudents, setEnrollStudents] = useState<StudioStudent[]>([]);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [enrollSheetBaseline, setEnrollSheetBaseline] = useState<{
    excludeIds: string[];
    seatsLeft: number;
  } | null>(null);

  const headerQuery = useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => api.get<BatchHeader>(`/batches/${batchId}`),
  });

  const activeRosterQuery = useQuery({
    queryKey: ["batch", batchId, "roster", "active"],
    queryFn: async () => {
      const data = await api.get<
        Page<BatchEnrollmentRow> | BatchEnrollmentRow[]
      >(`/batches/${batchId}/roster?tab=active&limit=50`);
      return unwrapPage(data);
    },
  });

  const inactiveRosterQuery = useQuery({
    queryKey: ["batch", batchId, "roster", "inactive"],
    queryFn: async () => {
      const data = await api.get<
        Page<InactiveEnrollmentRow> | InactiveEnrollmentRow[]
      >(`/batches/${batchId}/roster?tab=inactive&limit=50`);
      return unwrapPage(data);
    },
  });

  const enrollments = useMemo(() => {
    const rows = activeRosterQuery.data ?? [];
    return [...rows].sort((a, b) =>
      a.student.name.localeCompare(b.student.name),
    );
  }, [activeRosterQuery.data]);
  const inactiveEnrollments = useMemo(() => {
    const rows = inactiveRosterQuery.data ?? [];
    return [...rows].sort((a, b) =>
      a.student.name.localeCompare(b.student.name),
    );
  }, [inactiveRosterQuery.data]);
  const enrolledIds = useMemo(
    () => enrollments.map((row) => row.studentId),
    [enrollments],
  );
  const plans = useMemo(
    () =>
      (headerQuery.data?.plans ?? []).filter(
        (plan) => plan.active && plan.kind === "INDIVIDUAL",
      ),
    [headerQuery.data?.plans],
  );
  const seatsTaken = headerQuery.data?.enrollmentCount ?? enrollments.length;
  const seatsLeft =
    headerQuery.data?.remainingSeats ?? Math.max(0, capacity - seatsTaken);
  const enrollExcludeIds = enrollSheetBaseline?.excludeIds ?? enrolledIds;
  const enrollMaxSelected = enrollSheetBaseline?.seatsLeft ?? seatsLeft;
  const isFull = seatsLeft <= 0;
  const isLoading =
    headerQuery.isLoading ||
    activeRosterQuery.isLoading ||
    inactiveRosterQuery.isLoading;
  const hasUpcomingSessions =
    !headerQuery.isLoading &&
    upcomingSessions(headerQuery.data?.sessions).length > 0;
  const hasPlans = plans.length > 0;
  const canEnroll = active && !isFull && hasUpcomingSessions && hasPlans;

  const enroll = useMutation({
    mutationFn: async (input: {
      students: StudioStudent[];
      subscriptionId: string;
    }) => {
      await api.post(`/batches/${batchId}/enroll-bulk`, {
        studentIds: input.students.map((student) => student.id),
        subscriptionId: input.subscriptionId,
      });
    },
    onMutate: async ({ students }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["batch", batchId] }),
        queryClient.cancelQueries({
          queryKey: ["batch", batchId, "roster", "active"],
        }),
      ]);

      const previousHeader = queryClient.getQueryData<BatchHeader>([
        "batch",
        batchId,
      ]);
      const previousRoster = queryClient.getQueryData<BatchEnrollmentRow[]>([
        "batch",
        batchId,
        "roster",
        "active",
      ]);

      queryClient.setQueryData<BatchHeader>(["batch", batchId], (current) => {
        if (!current) return current;
        const enrollmentCount =
          (current.enrollmentCount ?? previousRoster?.length ?? 0) +
          students.length;
        return {
          ...current,
          enrollmentCount,
          remainingSeats: Math.max(0, current.capacity - enrollmentCount),
        };
      });

      queryClient.setQueryData<BatchEnrollmentRow[]>(
        ["batch", batchId, "roster", "active"],
        (current) => {
          const existing = new Set((current ?? []).map((row) => row.studentId));
          const additions = students.filter(
            (student) => !existing.has(student.id),
          );
          if (additions.length === 0) return current;
          return [
            ...additions.map((student) => ({
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
            })),
            ...(current ?? []),
          ];
        },
      );

      return { previousHeader, previousRoster };
    },
    onSuccess: (_data, input) => {
      const count = input.students.length;
      toast({
        title: count === 1 ? "Student enrolled" : `${count} students enrolled`,
        description:
          "They’re on the roster. A prepaid invoice is created when they join on the 1st or before the first session; otherwise the first bill is at month-end.",
        variant: "success",
      });
      closeEnrollSheet();
    },
    onError: (error: unknown, _input, context) => {
      if (context?.previousHeader) {
        queryClient.setQueryData(["batch", batchId], context.previousHeader);
      }
      if (context?.previousRoster) {
        queryClient.setQueryData(
          ["batch", batchId, "roster", "active"],
          context.previousRoster,
        );
      }
      toast({
        title: "Couldn’t enroll students",
        description:
          error instanceof Error ? error.message : "Could not enroll students.",
        variant: "error",
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
        queryClient.invalidateQueries({
          queryKey: ["batch", batchId, "roster"],
        }),
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

  function resetEnrollDraft() {
    setEnrollStudentIds([]);
    setEnrollStudents([]);
    setSubscriptionId(null);
  }

  function openEnrollSheet() {
    resetEnrollDraft();
    setEnrollSheetBaseline({
      excludeIds: enrolledIds,
      seatsLeft,
    });
    setEnrollOpen(true);
  }

  function closeEnrollSheet() {
    setEnrollOpen(false);
    setEnrollSheetBaseline(null);
    resetEnrollDraft();
  }

  function handleEnrollAction() {
    if (enrollStudents.length === 0 || !subscriptionId || !canEnroll) return;
    enroll.mutate({
      students: enrollStudents,
      subscriptionId,
    });
  }

  function openStudent(id: string) {
    void navigate({
      to: "/app/students/$id",
      params: { id },
    });
  }

  if (headerQuery.isError || activeRosterQuery.isError) {
    const error = headerQuery.error ?? activeRosterQuery.error;
    return (
      <ErrorState
        description={
          error instanceof Error ? error.message : "Could not load students."
        }
        action={
          <TouchButton
            variant="primary"
            onClick={() => {
              void headerQuery.refetch();
              void activeRosterQuery.refetch();
              void inactiveRosterQuery.refetch();
            }}
          >
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
        {hasUpcomingSessions ? (
          <Button
            variant="quiet"
            size="sm"
            isDisabled={!canEnroll}
            data-testid="enroll-open"
            onClick={openEnrollSheet}
            className={styles.enrollInline}
          >
            Add student
          </Button>
        ) : null}
      </div>

      <Tabs
        selectedKey={rosterTab}
        onSelectionChange={(key) => {
          if (key === "active" || key === "inactive" || key === "attendance") {
            setRosterTab(key);
          }
        }}
        aria-label="Student roster"
      >
        <TabList>
          <Tab id="active" data-testid="roster-tab-active">
            Active
          </Tab>
          <Tab id="inactive" data-testid="roster-tab-inactive">
            Inactive
          </Tab>
          <Tab id="attendance" data-testid="roster-tab-attendance">
            Attendance
          </Tab>
        </TabList>

        <TabPanel id="active">
          <div className={styles.panel}>
            {!isLoading && !hasUpcomingSessions ? (
              <div className={staff.softPanel}>
                <p className={styles.hint}>
                  No upcoming sessions — enrollment is closed until this batch
                  has a next class on the schedule.
                </p>
              </div>
            ) : hasUpcomingSessions ? (
              <div className={staff.softPanel}>
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
                    Batch is at capacity. Increase capacity to add more
                    students.
                  </p>
                ) : null}
              </div>
            ) : null}

            {enrollments.length === 0 ? (
              <EmptyState
                icon={ENTITY_ICONS.student}
                title="No students enrolled"
                description="Add students and pick a package to enroll."
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
                      onClick={() => openStudent(row.studentId)}
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
        </TabPanel>

        <TabPanel id="inactive">
          <div className={styles.panel}>
            {inactiveEnrollments.length === 0 ? (
              <EmptyState
                icon={ENTITY_ICONS.student}
                title="No inactive students"
                description="Students who move or unenroll stay here while their membership month is still active."
              />
            ) : (
              <div className={styles.list}>
                {inactiveEnrollments.map((row) => {
                  const student = row.student;
                  const initials = student.name.slice(0, 1).toUpperCase();
                  const chip = inactiveChipLabel(row.inactiveReason);

                  return (
                    <PressableCard
                      key={row.studentId}
                      onClick={() => openStudent(row.studentId)}
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
                              <Badge
                                variant="neutral"
                                data-testid={`inactive-reason-${row.studentId}`}
                              >
                                {chip}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Icon name="chevron-right" className={styles.chevron} />
                      </div>
                    </PressableCard>
                  );
                })}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel id="attendance">
          <BatchAttendanceTab
            batchId={batchId}
            enabled={rosterTab === "attendance"}
          />
        </TabPanel>
      </Tabs>

      <AppBottomSheet
        isOpen={enrollOpen}
        onOpenChange={(open) => {
          if (!open) closeEnrollSheet();
          else setEnrollOpen(true);
        }}
        title="Add students"
        size="tall"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Search students in this studio, choose a package, then enroll them
            in this batch.
          </p>
          <StudentSearchMultiselect
            selectedIds={enrollStudentIds}
            onSelectedIdsChange={setEnrollStudentIds}
            onSelectedStudentsChange={setEnrollStudents}
            excludeIds={enrollExcludeIds}
            maxSelected={enrollMaxSelected}
            enabled={enrollOpen}
            isDisabled={enroll.isPending}
            testIdPrefix="enroll-student"
            label="Search students"
            placeholder="Search students"
            emptyTitle="No students found"
            emptyDescription="Try a different name or email."
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
            isDisabled={!hasPlans || enroll.isPending}
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
          <div className={staff.sheetActions}>
            {enroll.isError ? (
              <ErrorState
                description={
                  enroll.error instanceof Error
                    ? enroll.error.message
                    : "Could not enroll students."
                }
              />
            ) : null}
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={
                !canEnroll ||
                enrollStudentIds.length === 0 ||
                !subscriptionId ||
                enroll.isPending
              }
              isPending={enroll.isPending}
              data-testid="enroll-button"
              onClick={handleEnrollAction}
            >
              {enrollStudentIds.length > 1
                ? `Enroll ${enrollStudentIds.length} students`
                : "Enroll"}
            </TouchButton>
          </div>
        </div>
      </AppBottomSheet>
    </div>
  );
}
