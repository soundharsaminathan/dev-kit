export type CalendarEventKind = "SESSION" | "BOOKING";

export type BookingType = "TRIAL" | "OPEN_SEAT" | "PRIVATE";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  batchId?: string;
  branchId?: string;
  branchName?: string;
  trainerIds?: string[];
  studentId?: string;
  bookingType?: BookingType;
  sessionId?: string;
};

export type UnscheduledBooking = {
  id: string;
  kind: "BOOKING";
  title: string;
  status: string;
  studentId: string;
  bookingType: BookingType;
  trainerId: string | null;
  studioId: string;
};

export type CalendarViewMode = "week" | "month";

export type CalendarScope = {
  studioId?: string | undefined;
  branchId?: string | undefined;
  trainerId?: string | undefined;
  studentId?: string | undefined;
};

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
}

export function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function rangeForView(
  focus: Date,
  view: CalendarViewMode,
): { from: Date; to: Date } {
  if (view === "week") {
    return { from: startOfWeek(focus), to: endOfWeek(focus) };
  }
  const monthStart = startOfMonth(focus);
  const monthEnd = endOfMonth(focus);
  return {
    from: startOfWeek(monthStart),
    to: endOfWeek(monthEnd),
  };
}

export function eventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  const start = startOfDay(day).getTime();
  const end = endOfDay(day).getTime();
  return events.filter((event) => {
    const s = new Date(event.startsAt).getTime();
    const e = new Date(event.endsAt).getTime();
    return s < end && e > start;
  });
}

export function eventPositionInDay(event: CalendarEvent, day: Date) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();
  const dayMs = dayEnd - dayStart;
  const start = Math.max(new Date(event.startsAt).getTime(), dayStart);
  const end = Math.min(new Date(event.endsAt).getTime(), dayEnd);
  const top = ((start - dayStart) / dayMs) * 100;
  const height = Math.max(((end - start) / dayMs) * 100, 1.5);
  return { top, height };
}
