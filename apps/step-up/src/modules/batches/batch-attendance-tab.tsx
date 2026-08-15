import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useLoadMoreOnScroll } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import {
  formatInvoiceMonthLabel,
  recentUtcMonthKeys,
  utcMonthKey,
} from "@/modules/payments/invoice-types";
import { PressableCard } from "@/modules/ui/pressable-card";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./batch-attendance-tab.module.scss";

export type BatchAttendanceStudent = {
  studentId: string;
  student: {
    id: string;
    name: string;
    photoUrl?: string | null;
  };
  eligibleCount: number;
  presentCount: number;
  absentCount: number;
  unmarkedCount: number;
};

export type BatchAttendanceSummary = {
  month: string;
  sessionCount: number;
  students: BatchAttendanceStudent[];
};

export type StudentAttendanceStatus = "PRESENT" | "ABSENT" | null;

export type StudentAttendanceSession = {
  id: string;
  startsAt: string;
  type: string;
  status: string;
  attendance: StudentAttendanceStatus;
};

export type StudentAttendanceDetail = {
  month: string;
  student: {
    id: string;
    name: string;
    photoUrl?: string | null;
  };
  sessionCount: number;
  sessions: StudentAttendanceSession[];
  counts: {
    eligibleCount: number;
    presentCount: number;
    absentCount: number;
    unmarkedCount: number;
  };
};

type BatchAttendanceTabProps = {
  batchId: string;
  enabled: boolean;
};

function formatSessionDayLabel(startsAt: string) {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatSessionTimeLabel(startsAt: string) {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusPillMeta(status: StudentAttendanceStatus) {
  if (status === "PRESENT") {
    return { label: "Present", tone: "present" } as const;
  }
  if (status === "ABSENT") {
    return { label: "Absent", tone: "absent" } as const;
  }
  return { label: "Unmarked", tone: "unmarked" } as const;
}

function AttendanceSkeleton() {
  return (
    <div
      className={styles.skeleton}
      role="status"
      aria-busy="true"
      aria-label="Loading attendance"
    >
      <div className={styles.metrics}>
        {["m0", "m1", "m2"].map((key) => (
          <div key={key} className={styles.metric}>
            <SkeletonBlock height="0.6875rem" width="55%" />
            <SkeletonBlock height="1rem" width="40%" />
          </div>
        ))}
      </div>
      {["r0", "r1", "r2"].map((key) => (
        <div key={key} className={styles.skeletonRow}>
          <SkeletonBlock
            height="3.5rem"
            width="3.5rem"
            radius="var(--radius-lg, 0.75rem)"
          />
          <div className={styles.skeletonBody}>
            <SkeletonBlock height="1rem" width="45%" />
            <SkeletonBlock height="0.75rem" width="70%" />
            <SkeletonBlock
              height="0.625rem"
              width="100%"
              radius="var(--radius-full, 999px)"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type StudentAttendanceSessionsProps = {
  batchId: string;
  studentId: string;
  studentName: string;
  month: string;
};

function StudentAttendanceSessions({
  batchId,
  studentId,
  studentName,
  month,
}: StudentAttendanceSessionsProps) {
  const api = useApi();

  const query = useQuery({
    queryKey: ["batch", batchId, "attendance", month, "student", studentId],
    queryFn: () =>
      api.get<StudentAttendanceDetail>(
        `/batches/${batchId}/attendance/${studentId}?month=${encodeURIComponent(month)}`,
      ),
  });

  if (query.isError) {
    return (
      <div className={styles.detailError}>
        <p>
          {query.error instanceof Error
            ? query.error.message
            : "Could not load sessions."}
        </p>
        <TouchButton
          variant="quiet"
          size="sm"
          onClick={() => {
            void query.refetch();
          }}
        >
          Try again
        </TouchButton>
      </div>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <div className={styles.detailLoading} aria-busy="true">
        {["d0", "d1", "d2", "d3"].map((key) => (
          <div key={key} className={styles.detailSkeletonRow}>
            <SkeletonBlock height="2.5rem" width="2.5rem" radius="0.625rem" />
            <div className={styles.detailSkeletonBody}>
              <SkeletonBlock height="0.8125rem" width="55%" />
              <SkeletonBlock height="0.625rem" width="30%" />
            </div>
            <SkeletonBlock height="1.25rem" width="4.5rem" radius="999px" />
          </div>
        ))}
      </div>
    );
  }

  const { sessions, counts } = query.data;

  if (sessions.length === 0) {
    return (
      <div className={styles.detailEmpty}>
        <Icon name="calendar" className={styles.detailEmptyIcon} />
        <p>No eligible sessions for {studentName} this month.</p>
      </div>
    );
  }

  return (
    <div
      className={styles.detail}
      data-testid={`student-attendance-detail-${studentId}`}
    >
      <div className={styles.detailHeader}>
        <span className={styles.detailTitle}>{studentName}</span>
        <div className={styles.detailChips}>
          {counts.presentCount > 0 ? (
            <span className={styles.chip} data-tone="present">
              {counts.presentCount} present
            </span>
          ) : null}
          {counts.absentCount > 0 ? (
            <span className={styles.chip} data-tone="absent">
              {counts.absentCount} absent
            </span>
          ) : null}
          {counts.unmarkedCount > 0 ? (
            <span className={styles.chip} data-tone="unmarked">
              {counts.unmarkedCount} unmarked
            </span>
          ) : null}
        </div>
      </div>

      <ul className={styles.sessionList}>
        {sessions.map((session) => {
          const meta = statusPillMeta(session.attendance);
          return (
            <li
              key={session.id}
              className={styles.sessionRow}
              data-testid={`student-session-${session.id}`}
            >
              <div className={styles.sessionDate}>
                <span className={styles.sessionDay}>
                  {formatSessionDayLabel(session.startsAt)}
                </span>
                <span className={styles.sessionTime}>
                  {formatSessionTimeLabel(session.startsAt)}
                </span>
              </div>
              <span
                className={styles.sessionStatus}
                data-tone={meta.tone}
                data-testid={`student-session-status-${session.id}`}
              >
                <span className={styles.sessionStatusDot} aria-hidden />
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function attendancePercent(present: number, eligible: number) {
  if (eligible <= 0) return 0;
  return Math.round((present / eligible) * 100);
}

function averageAttendancePercent(students: BatchAttendanceStudent[]) {
  const withClasses = students.filter((row) => row.eligibleCount > 0);
  if (withClasses.length === 0) return 0;
  const sum = withClasses.reduce(
    (total, row) =>
      total + attendancePercent(row.presentCount, row.eligibleCount),
    0,
  );
  return Math.round(sum / withClasses.length);
}

const ATTENDANCE_PAGE_SIZE = 25;

export function BatchAttendanceTab({
  batchId,
  enabled,
}: BatchAttendanceTabProps) {
  const api = useApi();
  const [month, setMonth] = useState(() => utcMonthKey());
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null,
  );

  const monthChips = useMemo(() => {
    const current = utcMonthKey();
    return recentUtcMonthKeys(12).map((id) => ({
      id,
      label: id === current ? "This month" : formatInvoiceMonthLabel(id),
    }));
  }, []);

  const query = useQuery({
    queryKey: ["batch", batchId, "attendance", month],
    enabled,
    queryFn: () =>
      api.get<BatchAttendanceSummary>(
        `/batches/${batchId}/attendance?month=${encodeURIComponent(month)}`,
      ),
  });

  const students = query.data?.students ?? [];
  const sessionCount = query.data?.sessionCount ?? 0;
  const avgPercent = averageAttendancePercent(students);
  const [visibleCount, setVisibleCount] = useState(ATTENDANCE_PAGE_SIZE);
  const [windowKey, setWindowKey] = useState(month);
  if (windowKey !== month) {
    setWindowKey(month);
    setVisibleCount(ATTENDANCE_PAGE_SIZE);
    setExpandedStudentId(null);
  }
  const visibleStudents = students.slice(0, visibleCount);
  const hasMore = visibleCount < students.length;
  const loadMore = useCallback(() => {
    setVisibleCount((count) => count + ATTENDANCE_PAGE_SIZE);
  }, []);
  const loadMoreRef = useLoadMoreOnScroll({
    hasMore,
    onLoadMore: loadMore,
  });

  function toggleStudent(id: string) {
    setExpandedStudentId((current) => (current === id ? null : id));
  }

  return (
    <div className={styles.root} data-testid="batch-attendance-tab">
      <div className={styles.filters}>
        <Select
          aria-label="Attendance month"
          selectedKey={month}
          onSelectionChange={(key) => {
            if (key != null) setMonth(String(key));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthChips.map((option) => (
              <SelectItem
                key={option.id}
                id={option.id}
                textValue={option.label}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? <AttendanceSkeleton /> : null}

      {query.isError ? (
        <ErrorState
          description={
            query.error instanceof Error
              ? query.error.message
              : "Could not load attendance."
          }
          action={
            <TouchButton
              variant="primary"
              onClick={() => {
                void query.refetch();
              }}
            >
              Try again
            </TouchButton>
          }
        />
      ) : null}

      {!query.isLoading && !query.isError && sessionCount === 0 ? (
        <EmptyState
          icon={ENTITY_ICONS.batch}
          title="No classes this month"
          description="Sessions for this month will show attendance totals here."
        />
      ) : null}

      {!query.isLoading &&
      !query.isError &&
      sessionCount > 0 &&
      students.length === 0 ? (
        <EmptyState
          icon={ENTITY_ICONS.student}
          title="No students this month"
          description="Students enrolled during this month will appear here."
        />
      ) : null}

      {!query.isLoading && !query.isError && students.length > 0 ? (
        <>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Students</span>
              <span className={styles.metricValue}>{students.length}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Classes</span>
              <span className={styles.metricValue}>{sessionCount}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Average</span>
              <span
                className={styles.metricValue}
                data-tone={avgPercent < 60 ? "danger" : undefined}
              >
                {avgPercent}%
              </span>
            </div>
          </div>

          <div className={styles.list}>
            {visibleStudents.map((row) => {
              const student = row.student;
              const initials = student.name.slice(0, 1).toUpperCase();
              const eligible = Math.max(0, row.eligibleCount);
              const present = Math.min(eligible, Math.max(0, row.presentCount));
              const absent = Math.min(
                eligible - present,
                Math.max(0, row.absentCount),
              );
              const unmarked = Math.max(0, eligible - present - absent);
              const presentPct = eligible > 0 ? (present / eligible) * 100 : 0;
              const absentPct = eligible > 0 ? (absent / eligible) * 100 : 0;
              const rate = attendancePercent(present, eligible);
              const expanded = expandedStudentId === row.studentId;

              return (
                <div key={row.studentId} className={styles.studentItem}>
                  <PressableCard
                    onClick={() => toggleStudent(row.studentId)}
                    aria-expanded={expanded}
                    aria-controls={`student-attendance-${row.studentId}`}
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
                          <span
                            className={styles.count}
                            data-testid={`attendance-count-${row.studentId}`}
                            data-rate={rate}
                          >
                            <span className={styles.countPresent}>
                              {present}
                            </span>
                            <span className={styles.countSep}>/</span>
                            <span className={styles.countTotal}>
                              {eligible}
                            </span>
                          </span>
                        </div>

                        <div
                          className={styles.track}
                          aria-hidden
                          data-empty={eligible === 0 ? "true" : undefined}
                        >
                          <span
                            className={styles.trackPresent}
                            style={{ width: `${presentPct}%` }}
                          />
                          <span
                            className={styles.trackAbsent}
                            style={{ width: `${absentPct}%` }}
                          />
                          <span
                            className={styles.trackUnmarked}
                            style={{
                              width: `${Math.max(0, 100 - presentPct - absentPct)}%`,
                            }}
                          />
                        </div>

                        <p className={styles.meta}>
                          {present} present
                          {absent > 0 || unmarked > 0 ? (
                            <>
                              {" · "}
                              {absent + unmarked} missed
                            </>
                          ) : null}
                        </p>
                      </div>

                      <Icon
                        name="chevron-right"
                        className={styles.chevron}
                        data-expanded={expanded ? "true" : undefined}
                      />
                    </div>
                  </PressableCard>

                  {expanded ? (
                    <div
                      id={`student-attendance-${row.studentId}`}
                      className={styles.detailRegion}
                    >
                      <StudentAttendanceSessions
                        batchId={batchId}
                        studentId={row.studentId}
                        studentName={student.name}
                        month={month}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {hasMore ? (
            <div
              ref={loadMoreRef}
              className={styles.loadMore}
              data-testid="batch-attendance-load-more"
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
