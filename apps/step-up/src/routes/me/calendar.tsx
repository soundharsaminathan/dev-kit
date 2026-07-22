import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { STUDIO_ID } from "@/lib/constants";
import { CalendarPage } from "@/modules/calendar/calendar-page";
import type { CalendarViewMode } from "@/modules/calendar/types";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";

type CalendarSearch = {
  view: CalendarViewMode;
  focus: string;
};

function parseSearch(search: Record<string, unknown>): CalendarSearch {
  const view = search.view === "month" ? "month" : "week";
  const focusRaw = typeof search.focus === "string" ? search.focus : "";
  const focusDate = focusRaw ? new Date(focusRaw) : new Date();
  const focus = Number.isNaN(focusDate.getTime())
    ? new Date().toISOString()
    : focusDate.toISOString();
  return { view, focus };
}

export const Route = createFileRoute("/me/calendar")({
  validateSearch: (search: Record<string, unknown>): CalendarSearch =>
    parseSearch(search),
  component: MeCalendarPage,
});

function MeCalendarPage() {
  const { studentId } = useActiveStudentContext();
  const navigate = useNavigate({ from: "/me/calendar" });
  const search = Route.useSearch();
  const focus = useMemo(() => new Date(search.focus), [search.focus]);

  return (
    <CalendarPage
      title="Calendar"
      description="Your upcoming classes and confirmed bookings."
      scope={{
        studioId: STUDIO_ID,
        studentId,
      }}
      view={search.view}
      focus={focus}
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
    />
  );
}
