function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function lastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function anniversaryDayInMonth(
  createdDay: number,
  year: number,
  monthIndex: number,
) {
  return Math.min(createdDay, lastDayOfMonth(year, monthIndex));
}

function wholeYearsBetween(created: Date, current: Date) {
  let years = current.getFullYear() - created.getFullYear();
  const anniversary = anniversaryDayInMonth(
    created.getDate(),
    current.getFullYear(),
    created.getMonth(),
  );
  const anniversaryPassed =
    current.getMonth() > created.getMonth() ||
    (current.getMonth() === created.getMonth() &&
      current.getDate() >= anniversary);
  if (!anniversaryPassed) years -= 1;
  return years;
}

function wholeMonthsBetween(created: Date, current: Date) {
  let months =
    (current.getFullYear() - created.getFullYear()) * 12 +
    (current.getMonth() - created.getMonth());
  const anniversary = anniversaryDayInMonth(
    created.getDate(),
    current.getFullYear(),
    current.getMonth(),
  );
  if (current.getDate() < anniversary) months -= 1;
  return months;
}

function wholeCalendarDaysBetween(created: Date, current: Date) {
  const createdDay = new Date(
    created.getFullYear(),
    created.getMonth(),
    created.getDate(),
  );
  const currentDay = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
  );
  return Math.round((currentDay.getTime() - createdDay.getTime()) / 86_400_000);
}

export function formatActiveDuration(
  createdAt: string | Date | null | undefined,
  now: number | Date = Date.now(),
): string | null {
  if (createdAt == null || createdAt === "") return null;

  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(created.getTime()) || Number.isNaN(current.getTime())) {
    return null;
  }
  if (current.getTime() < created.getTime()) return null;

  const years = wholeYearsBetween(created, current);
  if (years >= 1) {
    return `Active ${years} ${pluralize(years, "Year", "Years")}`;
  }

  const months = wholeMonthsBetween(created, current);
  if (months >= 1) {
    return `Active ${months} ${pluralize(months, "Month", "Months")}`;
  }

  const days = Math.max(1, wholeCalendarDaysBetween(created, current));
  return `Active ${days} ${pluralize(days, "Day", "Days")}`;
}
