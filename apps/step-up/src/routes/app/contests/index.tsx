import { Badge } from "@dev-ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/constants";
import { useStudioId } from "@/lib/use-studio-id";
import type { Contest } from "@/modules/contests/types";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | undefined
> = {
  OPEN: "success",
  DRAFT: "warning",
  CLOSED: "info",
  COMPLETED: "info",
  CANCELLED: "danger",
};

export const Route = createFileRoute("/app/contests/")({
  component: () => (
    <RequireStudioFeature feature="contests">
      <ContestsPage />
    </RequireStudioFeature>
  ),
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ContestsPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("ALL");
  const canManage = isAdminRole(user?.role);

  const query = useQuery({
    queryKey: ["contests", studioId],
    queryFn: () => api.get<Contest[]>(`/contests/studio/${studioId}`),
  });

  const filtered = useMemo(() => {
    const items = query.data ?? [];
    if (filter === "ALL") return items;
    return items.filter((contest) => contest.status === filter);
  }, [query.data, filter]);

  return (
    <Screen
      title="Contests"
      subtitle="Style and age-category events with judges and certificates."
      actions={
        canManage ? (
          <TouchButton variant="primary" size="md">
            <Link to="/app/contests/new">New</Link>
          </TouchButton>
        ) : undefined
      }
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={staff.section}>
          <FilterChipRow
            chips={[
              { id: "ALL", label: "All" },
              { id: "OPEN", label: "Open" },
              { id: "DRAFT", label: "Draft" },
              { id: "CLOSED", label: "Closed" },
            ]}
            selected={[filter]}
            onToggle={(id) => setFilter(id)}
          />

          {query.isLoading ? <SkeletonCardList count={3} /> : null}

          {query.isError ? (
            <ErrorState
              description={
                query.error instanceof Error
                  ? query.error.message
                  : "Could not load contests."
              }
              action={
                <TouchButton variant="primary" onClick={() => query.refetch()}>
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {query.data && filtered.length === 0 ? (
            <EmptyState
              title="No contests yet"
              description="Create a contest with categories, judges, and certificates."
              action={
                <TouchButton variant="primary">
                  <Link to="/app/contests/new">New contest</Link>
                </TouchButton>
              }
            />
          ) : null}

          {filtered.length > 0 ? (
            <div className={staff.list}>
              {filtered.map((contest) => (
                <PressableCard
                  key={contest.id}
                  onClick={() =>
                    void navigate({
                      to: "/app/contests/$id",
                      params: { id: contest.id },
                    })
                  }
                >
                  <div className={staff.rowCard}>
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>{contest.title}</span>
                      <Badge variant={STATUS_VARIANT[contest.status]}>
                        {contest.status}
                      </Badge>
                    </div>
                    <p className={staff.rowMeta}>
                      {formatDate(contest.startsAt)} –{" "}
                      {formatDate(contest.endsAt)}
                      {contest.branch ? ` · ${contest.branch.name}` : null}
                    </p>
                    <p className={staff.rowMeta}>
                      {contest.categories.length} categor
                      {contest.categories.length === 1 ? "y" : "ies"}
                      {contest.certificationEnabled ? " · Certificates on" : ""}
                    </p>
                  </div>
                </PressableCard>
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}
