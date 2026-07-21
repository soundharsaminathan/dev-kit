import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import type { CalendarEvent, CalendarScope, UnscheduledBooking } from "./types";

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

export function useUnscheduledBookings(scope: CalendarScope, enabled = true) {
  const api = useApi();
  const params = new URLSearchParams();
  if (scope.studioId) params.set("studioId", scope.studioId);
  if (scope.branchId) params.set("branchId", scope.branchId);
  if (scope.trainerId) params.set("trainerId", scope.trainerId);
  if (scope.studentId) params.set("studentId", scope.studentId);

  return useQuery({
    queryKey: [
      "calendar",
      "unscheduled",
      scope.studioId,
      scope.branchId,
      scope.trainerId,
      scope.studentId,
    ],
    queryFn: () =>
      api.get<UnscheduledBooking[]>(
        `/calendar/events/unscheduled?${params.toString()}`,
      ),
    enabled: enabled && !scope.branchId,
  });
}
