type DayTime = { weekday: number; startTime: string; endTime: string };

type ScheduleShape = {
  frequency?: string;
  weekdays?: number[];
  startTime?: string;
  endTime?: string;
  dayTimes?: DayTime[];
};

function parseSchedule(schedule: unknown): ScheduleShape | null {
  if (!schedule || typeof schedule !== "object") return null;
  return schedule as ScheduleShape;
}

function minutesFromHhmm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

/** Morning = start before 12:00; evening = start at or after 12:00. */
export function timeBandsFromSchedule(schedule: unknown): {
  morning: boolean;
  evening: boolean;
} {
  const s = parseSchedule(schedule);
  if (!s) return { morning: false, evening: false };

  const starts: string[] = [];
  for (const slot of s.dayTimes ?? []) {
    if (slot?.startTime) starts.push(slot.startTime);
  }
  if (starts.length === 0 && s.startTime) starts.push(s.startTime);

  let morning = false;
  let evening = false;
  for (const start of starts) {
    const minutes = minutesFromHhmm(start);
    if (minutes == null) continue;
    if (minutes < 12 * 60) morning = true;
    else evening = true;
  }
  return { morning, evening };
}

const WEEKDAY_SET = new Set([1, 2, 3, 4, 5]); // Mon–Fri (ISO-ish 1–7)
const WEEKEND_SET = new Set([0, 6, 7]); // Sun=0 or 7, Sat=6

export function dayBandsFromSchedule(schedule: unknown): {
  weekday: boolean;
  weekend: boolean;
} {
  const s = parseSchedule(schedule);
  if (!s) return { weekday: false, weekend: false };

  if (s.frequency === "DAILY") {
    return { weekday: true, weekend: true };
  }

  const days = new Set<number>();
  for (const slot of s.dayTimes ?? []) {
    if (typeof slot?.weekday === "number") days.add(slot.weekday);
  }
  for (const day of s.weekdays ?? []) {
    if (typeof day === "number") days.add(day);
  }

  let weekday = false;
  let weekend = false;
  for (const day of days) {
    if (WEEKDAY_SET.has(day)) weekday = true;
    if (WEEKEND_SET.has(day)) weekend = true;
  }
  return { weekday, weekend };
}

export function batchTimingLabel(bands: {
  morning: boolean;
  evening: boolean;
}): string | null {
  if (bands.morning && bands.evening) return "Morning and evening batches";
  if (bands.morning) return "Morning batches";
  if (bands.evening) return "Evening batches";
  return null;
}

const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function collectWeekdays(schedule: ScheduleShape): number[] {
  const days = new Set<number>();
  for (const slot of schedule.dayTimes ?? []) {
    if (typeof slot?.weekday === "number") days.add(slot.weekday);
  }
  for (const day of schedule.weekdays ?? []) {
    if (typeof day === "number") days.add(day);
  }
  return [...days]
    .map((day) => (day === 7 ? 0 : day))
    .filter((day, index, all) => all.indexOf(day) === index)
    .sort((a, b) => a - b);
}

function firstStartTime(schedule: ScheduleShape): string | null {
  for (const slot of schedule.dayTimes ?? []) {
    if (slot?.startTime) return slot.startTime;
  }
  return schedule.startTime ?? null;
}

export function batchScheduleLabel(schedule: unknown): string | null {
  const parsed = parseSchedule(schedule);
  if (!parsed) return null;
  const start = firstStartTime(parsed);
  if (parsed.frequency === "DAILY") {
    return start ? `Daily · ${start}` : "Daily";
  }
  const days = collectWeekdays(parsed)
    .map((day) => DAY_LABELS[day])
    .filter(Boolean);
  const dayPart = days.length > 0 ? days.join(", ") : null;
  if (dayPart && start) return `${dayPart} · ${start}`;
  return dayPart ?? start;
}
