import type { BookingType } from "@prisma/client";

export type CalendarEventKind = "SESSION" | "BOOKING";

export type CalendarEventDto = {
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

export type CalendarQueryInput = {
  from: Date;
  to: Date;
  studioId?: string;
  branchId?: string;
  trainerId?: string;
  studentId?: string;
};

export type SessionForCalendar = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  batchId: string;
  batch: {
    name: string;
    studioId: string;
    branchId: string;
    branch: { id: string; name: string } | null;
    trainers: { trainerId: string }[];
    enrollments: { studentId: string }[];
  };
};

export type BookingForCalendar = {
  id: string;
  type: BookingType;
  status: string;
  studentId: string;
  trainerId: string | null;
  studioId: string;
  sessionId: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  session: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    batch: {
      id: string;
      name: string;
      branchId: string;
      branch: { id: string; name: string } | null;
    };
  } | null;
};

const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000;

export function assertCalendarRange(from: Date, to: Date): void {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid from or to");
  }
  if (to <= from) {
    throw new Error("to must be after from");
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new Error("Date range cannot exceed 62 days");
  }
}

export function sessionMatchesScope(
  session: SessionForCalendar,
  query: CalendarQueryInput,
): boolean {
  if (query.studioId && session.batch.studioId !== query.studioId) {
    return false;
  }
  if (query.branchId && session.batch.branchId !== query.branchId) {
    return false;
  }
  if (query.trainerId) {
    const teaches = session.batch.trainers.some(
      (t) => t.trainerId === query.trainerId,
    );
    if (!teaches) return false;
  }
  if (query.studentId) {
    const enrolled = session.batch.enrollments.some(
      (e) => e.studentId === query.studentId,
    );
    if (!enrolled) return false;
  }
  if (session.startsAt >= query.to || session.endsAt <= query.from) {
    return false;
  }
  return true;
}

export function resolveBookingTimes(booking: BookingForCalendar): {
  startsAt: Date;
  endsAt: Date;
} | null {
  if (booking.session) {
    return {
      startsAt: booking.session.startsAt,
      endsAt: booking.session.endsAt,
    };
  }
  if (booking.startsAt && booking.endsAt) {
    return { startsAt: booking.startsAt, endsAt: booking.endsAt };
  }
  return null;
}

export function bookingMatchesScope(
  booking: BookingForCalendar,
  query: CalendarQueryInput,
  timed: boolean,
): boolean {
  if (booking.status !== "CONFIRMED") {
    return false;
  }
  if (query.studioId && booking.studioId !== query.studioId) {
    return false;
  }
  if (query.studentId && booking.studentId !== query.studentId) {
    return false;
  }
  if (query.trainerId && booking.trainerId !== query.trainerId) {
    return false;
  }

  const times = resolveBookingTimes(booking);

  if (timed) {
    if (!times) return false;
    if (times.startsAt >= query.to || times.endsAt <= query.from) {
      return false;
    }
    if (query.branchId) {
      if (
        !booking.session ||
        booking.session.batch.branchId !== query.branchId
      ) {
        return false;
      }
    }
    return true;
  }

  if (times) return false;
  if (query.branchId) {
    return false;
  }
  return true;
}

export function toSessionEvent(session: SessionForCalendar): CalendarEventDto {
  return {
    id: `session:${session.id}`,
    kind: "SESSION",
    title: session.batch.name,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    status: session.status,
    batchId: session.batchId,
    branchId: session.batch.branchId,
    branchName: session.batch.branch?.name,
    trainerIds: session.batch.trainers.map((t) => t.trainerId),
    sessionId: session.id,
  };
}

function bookingTypeLabel(type: BookingType): string {
  if (type === "TRIAL") return "Trial";
  if (type === "PRIVATE") return "Private";
  return "Open seat";
}

export function toBookingEvent(
  booking: BookingForCalendar,
  times: { startsAt: Date; endsAt: Date },
): CalendarEventDto {
  const batchName = booking.session?.batch.name;
  return {
    id: `booking:${booking.id}`,
    kind: "BOOKING",
    title: batchName ?? bookingTypeLabel(booking.type),
    startsAt: times.startsAt.toISOString(),
    endsAt: times.endsAt.toISOString(),
    status: booking.status,
    batchId: booking.session?.batch.id,
    branchId: booking.session?.batch.branchId,
    branchName: booking.session?.batch.branch?.name,
    trainerIds: booking.trainerId ? [booking.trainerId] : undefined,
    studentId: booking.studentId,
    bookingType: booking.type,
    sessionId: booking.sessionId ?? undefined,
  };
}

export function buildCalendarEvents(
  sessions: SessionForCalendar[],
  bookings: BookingForCalendar[],
  query: CalendarQueryInput,
): CalendarEventDto[] {
  const sessionEvents = sessions
    .filter((s) => sessionMatchesScope(s, query))
    .map(toSessionEvent);
  const listedSessionIds = new Set(
    sessionEvents
      .map((event) => event.sessionId)
      .filter((id): id is string => Boolean(id)),
  );

  const bookingEvents: CalendarEventDto[] = [];
  for (const booking of bookings) {
    if (!bookingMatchesScope(booking, query, true)) continue;
    if (booking.sessionId && listedSessionIds.has(booking.sessionId)) {
      continue;
    }
    const times = resolveBookingTimes(booking);
    if (!times) continue;
    bookingEvents.push(toBookingEvent(booking, times));
  }

  return [...sessionEvents, ...bookingEvents].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function buildUnscheduledBookings(
  bookings: BookingForCalendar[],
  query: Omit<CalendarQueryInput, "from" | "to"> & {
    from?: Date;
    to?: Date;
  },
): Array<{
  id: string;
  kind: "BOOKING";
  title: string;
  status: string;
  studentId: string;
  bookingType: BookingType;
  trainerId: string | null;
  studioId: string;
}> {
  const scoped: CalendarQueryInput = {
    from: query.from ?? new Date(0),
    to: query.to ?? new Date("9999-12-31"),
    studioId: query.studioId,
    branchId: query.branchId,
    trainerId: query.trainerId,
    studentId: query.studentId,
  };

  return bookings
    .filter((b) => bookingMatchesScope(b, scoped, false))
    .map((booking) => {
      return {
        id: booking.id,
        kind: "BOOKING" as const,
        title: bookingTypeLabel(booking.type),
        status: booking.status,
        studentId: booking.studentId,
        bookingType: booking.type,
        trainerId: booking.trainerId,
        studioId: booking.studioId,
      };
    });
}
