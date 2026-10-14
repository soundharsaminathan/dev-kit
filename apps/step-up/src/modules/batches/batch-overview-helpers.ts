export type BatchOverviewSession = {
  id: string;
  startsAt: string;
  endsAt: string;
  status?: string | undefined;
};

export type BatchOverviewEnrollment = {
  enrolledAt?: string;
};

export function occupiedSeatsForOverview(input: {
  occupiedSeats?: number | undefined;
  remainingSeats?: number | undefined;
  capacity: number;
  enrollmentCount?: number | undefined;
  enrollmentsLength?: number | undefined;
}) {
  if (typeof input.occupiedSeats === "number") return input.occupiedSeats;
  if (typeof input.remainingSeats === "number") {
    return Math.max(0, input.capacity - input.remainingSeats);
  }
  return input.enrollmentCount ?? input.enrollmentsLength ?? 0;
}

export function fillPercent(occupied: number, capacity: number) {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((occupied / capacity) * 100));
}

export function nextUpcomingSession(
  sessions: BatchOverviewSession[] | undefined,
  now = new Date(),
) {
  return upcomingSessions(sessions, now, 1)[0] ?? null;
}

export function upcomingSessions(
  sessions: BatchOverviewSession[] | undefined,
  now = new Date(),
  limit = 5,
) {
  if (!sessions?.length || limit <= 0) return [];
  const nowMs = now.getTime();
  const upcoming: BatchOverviewSession[] = [];
  for (const session of sessions) {
    if (session.status === "CANCELLED") continue;
    const ends = new Date(session.endsAt).getTime();
    if (!Number.isFinite(ends) || ends < nowMs) continue;
    upcoming.push(session);
    if (upcoming.length >= limit) break;
  }
  return upcoming;
}

export function sessionTimingState(
  session: BatchOverviewSession,
  now = new Date(),
): "now" | "upcoming" | "past" {
  const nowMs = now.getTime();
  const starts = new Date(session.startsAt).getTime();
  const ends = new Date(session.endsAt).getTime();
  if (!Number.isFinite(starts) || !Number.isFinite(ends)) return "upcoming";
  if (ends < nowMs) return "past";
  if (starts <= nowMs && nowMs <= ends) return "now";
  return "upcoming";
}

export function formatNextSessionLabel(startsAt: string) {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSessionRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return "—";
  }
  const day = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} · ${startTime}–${endTime}`;
}

export function enrollmentModeLabel(
  mode: "STAFF_ONLY" | "SELF_JOIN" | string | undefined,
) {
  if (mode === "SELF_JOIN") return "Self-join";
  if (mode === "STAFF_ONLY") return "Staff enroll";
  return null;
}
