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
import { useNavigate } from "@tanstack/react-router";
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

type BatchAttendanceTabProps = {
  batchId: string;
  enabled: boolean;
};

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
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => utcMonthKey());

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

  function openStudent(id: string) {
    void navigate({
      to: "/app/students/$id",
      params: { id },
    });
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
                        <span
                          className={styles.count}
                          data-testid={`attendance-count-${row.studentId}`}
                          data-rate={rate}
                        >
                          <span className={styles.countPresent}>{present}</span>
                          <span className={styles.countSep}>/</span>
                          <span className={styles.countTotal}>{eligible}</span>
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

                    <Icon name="chevron-right" className={styles.chevron} />
                  </div>
                </PressableCard>
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
