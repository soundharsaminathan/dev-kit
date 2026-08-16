import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { useStudioId } from "@/lib/use-studio-id";
import { CalendarPage } from "@/modules/calendar/calendar-page";
import type { CalendarViewMode } from "@/modules/calendar/types";

type Branch = {
  id: string;
  name: string;
};

type CalendarSearch = {
  view: CalendarViewMode;
  focus: string;
  branchId?: string | undefined;
};

function parseSearch(search: Record<string, unknown>): CalendarSearch {
  const view = search.view === "month" ? "month" : "week";
  const focusRaw = typeof search.focus === "string" ? search.focus : "";
  const focusDate = focusRaw ? new Date(focusRaw) : new Date();
  const focus = Number.isNaN(focusDate.getTime())
    ? new Date().toISOString()
    : focusDate.toISOString();
  const result: CalendarSearch = { view, focus };
  if (typeof search.branchId === "string" && search.branchId.length > 0) {
    result.branchId = search.branchId;
  }
  return result;
}

export const Route = createFileRoute("/app/calendar")({
  validateSearch: (search: Record<string, unknown>): CalendarSearch =>
    parseSearch(search),
  component: AppCalendarPage,
});

function AppCalendarPage() {
  const { user } = useAuth();
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: "/app/calendar" });
  const search = Route.useSearch();
  const focus = useMemo(() => new Date(search.focus), [search.focus]);

  const isTrainer = user?.role === "TRAINER";
  const isStaff = user?.role === "OWNER" || user?.role === "STAFF";

  const branchesQuery = useQuery({
    queryKey: ["branches", studioId],
    queryFn: () => api.get<Branch[]>(`/studios/${studioId}/branches`),
    enabled: isStaff,
  });

  const scope = {
    studioId,
    branchId: search.branchId,
    trainerId: isTrainer ? user?.id : undefined,
  };

  return (
    <CalendarPage
      title="Calendar"
      description={
        isTrainer
          ? "Sessions for batches you teach and your confirmed bookings."
          : "Studio schedule across classes and confirmed bookings."
      }
      scope={scope}
      view={search.view}
      focus={focus}
      branches={isStaff ? branchesQuery.data : undefined}
      branchesLoading={isStaff && branchesQuery.isLoading}
      selectedBranchId={search.branchId ?? null}
      staffActions
      onViewChange={(view) => {
        void navigate({
          search: (prev) => ({ ...prev, view }),
        });
      }}
      onFocusChange={(next) => {
        void navigate({
          search: (prev) => ({ ...prev, focus: next.toISOString() }),
        });
      }}
      onBranchChange={
        isStaff
          ? (branchId) => {
              void navigate({
                search: (prev) => {
                  const next = { ...prev };
                  if (branchId) {
                    next.branchId = branchId;
                  } else {
                    delete next.branchId;
                  }
                  return next;
                },
              });
            }
          : undefined
      }
    />
  );
}
