export type PresentSessionDay = {
  sessionId: string;
  startsAt: Date;
};

export function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeSessionsCompleted(
  presentSessions: PresentSessionDay[],
): number {
  return new Set(presentSessions.map((row) => row.sessionId)).size;
}

export function computeAttendanceStreak(
  presentSessions: PresentSessionDay[],
  now = new Date(),
): number {
  if (presentSessions.length === 0) {
    return 0;
  }

  const presentDays = new Set(
    presentSessions.map((row) => toUtcDayKey(row.startsAt)),
  );

  const cursor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const todayKey = toUtcDayKey(cursor);
  const yesterday = new Date(cursor.getTime() - 86_400_000);
  const yesterdayKey = toUtcDayKey(yesterday);

  if (!presentDays.has(todayKey) && !presentDays.has(yesterdayKey)) {
    return 0;
  }

  if (!presentDays.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (presentDays.has(toUtcDayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function computeBatchProgress(input: {
  totalSessions: number;
  attendedSessions: number;
}) {
  const total = Math.max(0, input.totalSessions);
  const attended = Math.min(total, Math.max(0, input.attendedSessions));
  const percent = total === 0 ? 0 : Math.round((attended / total) * 100);
  return { totalSessions: total, attendedSessions: attended, percent };
}

export function monthPeriodBounds(now = new Date()) {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return { periodStart, periodEnd };
}
