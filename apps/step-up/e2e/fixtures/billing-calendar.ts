/**
 * UTC billing-calendar fixtures.
 *
 * Each case owns prepaid vs postpaid by the batch schedule it creates.
 * Seed kids/beginner batches are not the source of truth for join billing.
 *
 * Prepaid-at-join: no regular session this UTC month (schedule starts next month).
 * Postpaid first month: first regular session this month already started.
 * UTC 1st is always prepaid-at-join in product code, so postpaid cases skip that day.
 */

export type BatchScheduleJson = {
  frequency: "WEEKLY";
  weekdays: number[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  utcOffsetMinutes: 0;
};

export type CalendarKind = "prepaid" | "postpaid";

const COVER_IMAGE =
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80";

let slotSeq = 0;

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function utcYmd(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function utcMonthStart(at = new Date()) {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
}

export function utcNextMonthStart(at = new Date()) {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1));
}

export function isUtcFirstOfMonth(at = new Date()) {
  return at.getUTCDate() === 1;
}

/** Product: join on UTC 1st is always prepaid, even if a session already ran. */
export function canJoinPostpaidNow(at = new Date()) {
  return at.getUTCDate() > 1;
}

function hhmm(totalMinutes: number) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
}

/**
 * Non-overlapping 45-minute slots in 04:00–11:45 UTC so parallel HTTP tests
 * are less likely to hit trainer/branch schedule conflicts.
 */
export function uniqueClockSlot(stamp = Date.now()) {
  const buckets = Math.floor((8 * 60) / 45);
  const bucket = Math.abs(stamp + slotSeq++ * 19) % buckets;
  const startMinutes = 4 * 60 + bucket * 45;
  return {
    startTime: hhmm(startMinutes),
    endTime: hhmm(startMinutes + 45),
  };
}

/** First weekday this month whose session start is already in the past. */
export function pastWeekdayThisMonth(at = new Date(), startTime = "04:00") {
  const [hour, minute] = startTime.split(":").map(Number);
  for (let day = 1; day <= at.getUTCDate(); day += 1) {
    const startsAt = new Date(
      Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), day, hour, minute),
    );
    if (startsAt.getTime() < at.getTime()) {
      return startsAt.getUTCDay();
    }
  }
  return at.getUTCDay();
}

export function prepaidScheduleJson(stamp = Date.now()): BatchScheduleJson {
  const now = new Date();
  const start = utcNextMonthStart(now);
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 0),
  );
  const clock = uniqueClockSlot(stamp);
  return {
    frequency: "WEEKLY",
    weekdays: [Math.abs(stamp) % 7],
    startDate: utcYmd(start),
    endDate: utcYmd(end),
    ...clock,
    utcOffsetMinutes: 0,
  };
}

export function postpaidScheduleJson(stamp = Date.now()): BatchScheduleJson {
  const now = new Date();
  const start = utcMonthStart(now);
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0),
  );
  const clock = uniqueClockSlot(stamp);
  return {
    frequency: "WEEKLY",
    weekdays: [pastWeekdayThisMonth(now, clock.startTime)],
    startDate: utcYmd(start),
    endDate: utcYmd(end),
    ...clock,
    utcOffsetMinutes: 0,
  };
}

export function scheduleJsonFor(
  kind: CalendarKind,
  stamp = Date.now(),
): BatchScheduleJson {
  return kind === "prepaid"
    ? prepaidScheduleJson(stamp)
    : postpaidScheduleJson(stamp);
}

export function batchCreateBody(args: {
  studioId: string;
  branchId: string;
  trainerId: string;
  name: string;
  category: "ADULTS" | "KIDS";
  scheduleJson: BatchScheduleJson;
  subscriptionIds: readonly string[];
  capacity?: number;
  enrollmentMode?: "SELF_JOIN" | "STAFF_ONLY";
}) {
  return {
    studioId: args.studioId,
    name: args.name,
    coverImageUrl: COVER_IMAGE,
    category: args.category,
    branchId: args.branchId,
    trainerIds: [args.trainerId],
    danceCategories: [
      {
        name: "Hip Hop",
        description:
          args.category === "KIDS"
            ? "Owned kids calendar batch"
            : "Owned adult calendar batch",
      },
    ],
    scheduleJson: args.scheduleJson,
    capacity: args.capacity ?? 12,
    enrollmentMode: args.enrollmentMode ?? "SELF_JOIN",
    subscriptionIds: [...args.subscriptionIds],
    active: true,
    certificationEnabled: false,
  };
}

export function isScheduleConflict(error: unknown) {
  const text = String(error);
  return (
    text.includes("409") ||
    /conflict/i.test(text) ||
    /already scheduled/i.test(text) ||
    /overlap/i.test(text)
  );
}

export function markableSessionId(
  sessions: Array<{ id: string; startsAt: string }>,
  at = new Date(),
) {
  const opensBefore = at.getTime() + 15 * 60 * 1000;
  const open = sessions
    .filter((session) => new Date(session.startsAt).getTime() <= opensBefore)
    .sort(
      (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    );
  const id = open[0]?.id;
  if (!id) {
    throw new Error("Owned batch has no session in the attendance window");
  }
  return id;
}
