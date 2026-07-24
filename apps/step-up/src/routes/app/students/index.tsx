import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { BloomMenu } from "@/modules/ui/bloom-menu";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type StudentFunnelStage =
  | "active"
  | "signedInOnly"
  | "trialRegistered"
  | "trialAttended"
  | "completedWithoutPlan";

type StudentFunnelPeriod =
  | "lifetime"
  | "this_month"
  | "last_quarter"
  | "this_year_half"
  | "this_year";

type DirectoryStudent = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  createdAt: string;
  funnelStage: StudentFunnelStage;
};

type StudentsSearch = {
  stage?: StudentFunnelStage;
  period?: StudentFunnelPeriod;
};

const STAGE_CHIPS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "signedInOnly", label: "Signed in only" },
  { id: "trialRegistered", label: "Trial registered" },
  { id: "trialAttended", label: "Trial attended" },
  { id: "completedWithoutPlan", label: "Completed, no plan" },
];

const STAGE_LABELS: Record<StudentFunnelStage, string> = {
  active: "Active",
  signedInOnly: "Signed in only",
  trialRegistered: "Trial registered",
  trialAttended: "Trial attended",
  completedWithoutPlan: "Completed, no plan",
};

const PERIOD_CHIPS: Array<{ id: StudentFunnelPeriod; label: string }> = [
  { id: "lifetime", label: "Lifetime" },
  { id: "this_month", label: "This month" },
  { id: "last_quarter", label: "Last quarter" },
  { id: "this_year_half", label: "This year half" },
  { id: "this_year", label: "This year" },
];

const CREATE_ITEMS = [
  { id: "single", label: "Single add", icon: ENTITY_ICONS.student },
  { id: "bulk", label: "Bulk import", icon: "upload" as const },
];

const NEW_USER_DAYS = 14;

const FUNNEL_STAGES = new Set<string>([
  "active",
  "signedInOnly",
  "trialRegistered",
  "trialAttended",
  "completedWithoutPlan",
]);

const FUNNEL_PERIODS = new Set<string>([
  "lifetime",
  "this_month",
  "last_quarter",
  "this_year_half",
  "this_year",
]);

function parseSearch(search: Record<string, unknown>): StudentsSearch {
  const result: StudentsSearch = {};
  if (typeof search.stage === "string" && FUNNEL_STAGES.has(search.stage)) {
    result.stage = search.stage as StudentFunnelStage;
  }
  if (typeof search.period === "string" && FUNNEL_PERIODS.has(search.period)) {
    result.period = search.period as StudentFunnelPeriod;
  }
  return result;
}

function isNewStudent(createdAt: string, now = Date.now()) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created <= NEW_USER_DAYS * 24 * 60 * 60 * 1000;
}

export const Route = createFileRoute("/app/students/")({
  validateSearch: (search: Record<string, unknown>): StudentsSearch =>
    parseSearch(search),
  component: StudentsPage,
});

function StudentsPage() {
  const api = useApi();
  const navigate = useNavigate({ from: "/app/students/" });
  const search = Route.useSearch();
  const stage = search.stage;
  const period = search.period ?? "lifetime";
  const selectedStage = stage ?? "all";

  const query = useQuery({
    queryKey: ["student-directory", STUDIO_ID, stage ?? "all", period],
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (stage) params.set("stage", stage);
      return api.get<DirectoryStudent[]>(
        `/users/studio/${STUDIO_ID}/student-directory?${params.toString()}`,
      );
    },
  });

  const students = query.data ?? [];

  const subtitle = useMemo(() => {
    if (stage) {
      return `${STAGE_LABELS[stage]} · ${students.length} student${students.length === 1 ? "" : "s"}`;
    }
    return "Students registered at your studio.";
  }, [stage, students.length]);

  function handleCreateSelect(id: string) {
    if (id === "bulk") {
      void navigate({ to: "/app/students/import" });
      return;
    }
    void navigate({ to: "/app/students/new" });
  }

  function setStageFilter(id: string) {
    void navigate({
      search: (prev) => {
        if (id === "all") {
          const next: StudentsSearch = {};
          if (prev.period) next.period = prev.period;
          return next;
        }
        return {
          ...(prev.period ? { period: prev.period } : {}),
          stage: id as StudentFunnelStage,
        };
      },
    });
  }

  function setPeriodFilter(id: string) {
    void navigate({
      search: (prev) => {
        const next: StudentsSearch = {
          period: id as StudentFunnelPeriod,
        };
        if (prev.stage) next.stage = prev.stage;
        return next;
      },
    });
  }

  return (
    <Screen
      title="Students"
      subtitle={subtitle}
      actions={
        <BloomMenu
          items={CREATE_ITEMS}
          triggerLabel="Add student(s)"
          panelTitle="Add student(s)"
          onSelect={handleCreateSelect}
        />
      }
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={staff.section}>
          <FilterChipRow
            chips={STAGE_CHIPS}
            selected={[selectedStage]}
            onToggle={setStageFilter}
          />
          <FilterChipRow
            chips={PERIOD_CHIPS}
            selected={[period]}
            onToggle={setPeriodFilter}
          />

          {query.isLoading ? <SkeletonCardList count={4} /> : null}

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

          {query.isFetched && students.length === 0 ? (
            <EmptyState
              icon={ENTITY_ICONS.student}
              title={stage ? "No students in this filter" : "No students yet"}
              description={
                stage
                  ? "Try another stage or period, or clear the filter."
                  : "Add a student to get started."
              }
              action={
                stage ? (
                  <TouchButton
                    variant="primary"
                    onClick={() => setStageFilter("all")}
                  >
                    Show all
                  </TouchButton>
                ) : (
                  <TouchButton variant="primary">
                    <Link to="/app/students/new">Add student</Link>
                  </TouchButton>
                )
              }
            />
          ) : null}

          {students.length > 0 ? (
            <div className={staff.list}>
              {students.map((student) => {
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
                      <span className={staff.rowTitle}>{student.name}</span>
                      <p className={staff.rowMeta}>{student.email}</p>
                      {student.phone ? (
                        <p className={staff.rowMeta}>{student.phone}</p>
                      ) : null}
                      <p className={staff.rowMeta}>
                        {STAGE_LABELS[student.funnelStage]}
                      </p>
                    </div>
                  </PressableCard>
                );
              })}
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
