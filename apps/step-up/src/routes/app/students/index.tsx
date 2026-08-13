import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemLabel,
} from "@dev-ui/components/menu";
import { useLoadMoreOnScroll } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { formatPaidMonths } from "@/lib/format-paid-months";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import {
  AGE_RANGES,
  applyStudentFilters,
  type DirectoryStudent,
  FUNNEL_PERIODS,
  FUNNEL_STAGES,
  GENDERS,
  STAGE_LABELS,
  type StudentAgeRange,
  type StudentFiltersDraft,
  type StudentFunnelPeriod,
  type StudentFunnelStage,
  type StudentGender,
} from "@/modules/students/student-filter-types";
import { StudentFiltersToolbar } from "@/modules/students/student-filters-toolbar";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonRowList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type StudentsSearch = {
  stage?: StudentFunnelStage;
  period?: StudentFunnelPeriod;
  ageRange?: StudentAgeRange;
  gender?: StudentGender;
};

const CREATE_ITEMS = [
  { id: "single", label: "Single add" },
  { id: "bulk", label: "Bulk import" },
] as const;

const NEW_USER_DAYS = 14;
const STUDENT_PAGE_SIZE = 25;

function parseSearch(search: Record<string, unknown>): StudentsSearch {
  const result: StudentsSearch = {};
  if (typeof search.stage === "string" && FUNNEL_STAGES.has(search.stage)) {
    result.stage = search.stage as StudentFunnelStage;
  }
  if (typeof search.period === "string" && FUNNEL_PERIODS.has(search.period)) {
    result.period = search.period as StudentFunnelPeriod;
  }
  if (typeof search.ageRange === "string" && AGE_RANGES.has(search.ageRange)) {
    result.ageRange = search.ageRange as StudentAgeRange;
  }
  if (typeof search.gender === "string" && GENDERS.has(search.gender)) {
    result.gender = search.gender as StudentGender;
  }
  return result;
}

function toStudentsSearch(input: {
  stage: string;
  period: StudentFunnelPeriod;
  ageRange: string;
  gender: string;
}): StudentsSearch {
  const next: StudentsSearch = {};
  if (input.stage !== "ALL") next.stage = input.stage as StudentFunnelStage;
  if (input.period !== "lifetime") next.period = input.period;
  if (input.ageRange !== "ALL")
    next.ageRange = input.ageRange as StudentAgeRange;
  if (input.gender !== "ALL") next.gender = input.gender as StudentGender;
  return next;
}

function isNewStudent(createdAt: string, now = Date.now()) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created <= NEW_USER_DAYS * 24 * 60 * 60 * 1000;
}

export const Route = createFileRoute("/app/students/")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  validateSearch: (search: Record<string, unknown>): StudentsSearch =>
    parseSearch(search),
  component: StudentsPage,
});

function StudentsPage() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const stage = searchParams.stage ? searchParams.stage : "ALL";
  const period = searchParams.period ?? "lifetime";
  const ageRange = searchParams.ageRange ? searchParams.ageRange : "ALL";
  const gender = searchParams.gender ? searchParams.gender : "ALL";
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["student-directory", studioId],
    queryFn: () =>
      api.get<DirectoryStudent[]>(
        `/users/studio/${studioId}/student-directory?period=lifetime`,
      ),
  });

  const filtered = useMemo(
    () =>
      applyStudentFilters(query.data ?? [], {
        stage,
        period,
        ageRange,
        gender,
        search,
      }),
    [query.data, stage, period, ageRange, gender, search],
  );

  const listWindowKey = `${studioId}:${stage}:${period}:${ageRange}:${gender}:${search}`;
  const [visibleCount, setVisibleCount] = useState(STUDENT_PAGE_SIZE);
  const [windowKey, setWindowKey] = useState(listWindowKey);
  if (windowKey !== listWindowKey) {
    setWindowKey(listWindowKey);
    setVisibleCount(STUDENT_PAGE_SIZE);
  }

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = visibleCount < filtered.length;
  const loadMore = useCallback(() => {
    setVisibleCount((count) => count + STUDENT_PAGE_SIZE);
  }, []);
  const loadMoreRef = useLoadMoreOnScroll({
    hasMore,
    onLoadMore: loadMore,
  });

  const subtitle = useMemo(() => {
    if (stage !== "ALL") {
      return `${STAGE_LABELS[stage as StudentFunnelStage]} · ${filtered.length} student${filtered.length === 1 ? "" : "s"}`;
    }
    if (
      period !== "lifetime" ||
      ageRange !== "ALL" ||
      gender !== "ALL" ||
      search.trim()
    ) {
      return `${filtered.length} student${filtered.length === 1 ? "" : "s"}`;
    }
    return "Students registered at your studio.";
  }, [stage, period, ageRange, gender, search, filtered.length]);

  function countMatches(draft: StudentFiltersDraft) {
    return applyStudentFilters(query.data ?? [], draft).length;
  }

  function handleCreateSelect(id: string | number) {
    if (id === "bulk") {
      void navigate({ to: "/app/students/import" });
      return;
    }
    void navigate({ to: "/app/students/new" });
  }

  function setStageFilter(nextStage: string) {
    void navigate({
      search: () =>
        toStudentsSearch({
          stage: nextStage,
          period,
          ageRange,
          gender,
        }),
    });
  }

  function setPeriodFilter(nextPeriod: StudentFunnelPeriod) {
    void navigate({
      search: () =>
        toStudentsSearch({
          stage,
          period: nextPeriod,
          ageRange,
          gender,
        }),
    });
  }

  function setAgeRangeFilter(nextAgeRange: string) {
    void navigate({
      search: () =>
        toStudentsSearch({
          stage,
          period,
          ageRange: nextAgeRange,
          gender,
        }),
    });
  }

  function setGenderFilter(nextGender: string) {
    void navigate({
      search: () =>
        toStudentsSearch({
          stage,
          period,
          ageRange,
          gender: nextGender,
        }),
    });
  }

  function clearFilters() {
    setSearch("");
    void navigate({ search: {} });
  }

  const hasActiveFilters =
    stage !== "ALL" ||
    period !== "lifetime" ||
    ageRange !== "ALL" ||
    gender !== "ALL" ||
    Boolean(search.trim());

  return (
    <Screen
      title="Students"
      subtitle={subtitle}
      actions={
        <Menu>
          <TouchButton
            size="sm"
            variant="primary"
            aria-label="Add student(s)"
            data-testid="add-student-menu"
          >
            <Icon name="plus" />
            Add student(s)
          </TouchButton>
          <MenuContent
            placement="bottom end"
            onAction={handleCreateSelect}
            aria-label="Add student(s)"
          >
            {CREATE_ITEMS.map((item) => (
              <MenuItem key={item.id} id={item.id} textValue={item.label}>
                <MenuItemLabel>{item.label}</MenuItemLabel>
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      }
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={staff.section}>
          <StudentFiltersToolbar
            stage={stage}
            period={period}
            ageRange={ageRange}
            gender={gender}
            search={search}
            countMatches={countMatches}
            onStageChange={setStageFilter}
            onPeriodChange={setPeriodFilter}
            onAgeRangeChange={setAgeRangeFilter}
            onGenderChange={setGenderFilter}
            onSearchChange={setSearch}
          />

          {query.isLoading ? (
            <SkeletonRowList count={4} label="Loading students" />
          ) : null}

          {query.isError ? (
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
          ) : null}

          {query.data && query.data.length === 0 ? (
            <EmptyState
              icon={ENTITY_ICONS.student}
              title="No students yet"
              description="Add a student to get started."
              action={
                <TouchButton variant="primary">
                  <Link to="/app/students/new">Add student</Link>
                </TouchButton>
              }
            />
          ) : null}

          {query.data && query.data.length > 0 && filtered.length === 0 ? (
            <EmptyState
              icon={ENTITY_ICONS.student}
              title="No students found"
              description={
                hasActiveFilters
                  ? "Try another filter or clear your search."
                  : "No students match."
              }
              action={
                hasActiveFilters ? (
                  <TouchButton variant="primary" onClick={clearFilters}>
                    Clear filters
                  </TouchButton>
                ) : undefined
              }
            />
          ) : null}

          {visible.length > 0 ? (
            <div className={staff.list}>
              {visible.map((student) => {
                const showNew = isNewStudent(student.createdAt);
                return (
                  <PressableCard
                    key={student.id}
                    onClick={() =>
                      void navigate({
                        to: "/app/students/$id",
                        params: { id: student.id },
                      })
                    }
                  >
                    <div className={staff.rowCard}>
                      {showNew ? (
                        <span className={staff.newRibbon}>New</span>
                      ) : null}
                      <div className={staff.rowWithAvatar}>
                        <Avatar size="md" className={staff.trainerAvatar}>
                          {student.photoUrl ? (
                            <AvatarImage
                              src={student.photoUrl}
                              alt={student.name}
                            />
                          ) : null}
                          <AvatarFallback>
                            {student.name.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={staff.rowBody}>
                          <span className={staff.rowTitle}>{student.name}</span>
                          <span
                            className={staff.metaWithIcon}
                            data-testid={`paid-months-${student.id}`}
                          >
                            <Icon
                              name="wallet"
                              className={staff.metaWithIconIcon}
                            />
                            {formatPaidMonths(student.paidMonths ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </PressableCard>
                );
              })}
            </div>
          ) : null}

          {hasMore ? (
            <div
              ref={loadMoreRef}
              className={staff.loadMore}
              data-testid="students-load-more"
            />
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
