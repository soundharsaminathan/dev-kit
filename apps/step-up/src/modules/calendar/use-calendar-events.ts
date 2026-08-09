import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import type { CalendarEvent, CalendarScope } from "./types";

export function useCalendarEvents(
  scope: CalendarScope,
  from: Date,
  to: Date,
  enabled = true,
) {
  const api = useApi();
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  if (scope.studioId) params.set("studioId", scope.studioId);
  if (scope.branchId) params.set("branchId", scope.branchId);
  if (scope.trainerId) params.set("trainerId", scope.trainerId);
  if (scope.studentId) params.set("studentId", scope.studentId);

  return useQuery({
    queryKey: [
      "calendar",
      "events",
      scope.studioId,
      scope.branchId,
      scope.trainerId,
      scope.studentId,
      from.toISOString(),
      to.toISOString(),
    ],
    queryFn: () =>
      api.get<CalendarEvent[]>(`/calendar/events?${params.toString()}`),
    enabled,
  });
}
