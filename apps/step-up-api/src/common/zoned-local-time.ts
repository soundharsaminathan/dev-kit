const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidIanaTimeZone(timeZone: string): boolean {
  const trimmed = timeZone.trim();
  if (!trimmed) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/** Milliseconds east of UTC for the zone at `instant`. */
function zoneOffsetMs(timeZone: string, instant: Date): number {
  const d = new Date(instant.getTime());
  const utcRep = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
  const zoneRep = new Date(d.toLocaleString("en-US", { timeZone }));
  return zoneRep.getTime() - utcRep.getTime();
}

/**
 * Offset in the same convention as `Date.getTimezoneOffset()`:
 * minutes to add to local wall time to reach UTC (e.g. Asia/Kolkata → -330).
 */
export function utcOffsetMinutesForZone(
  timeZone: string,
  onDate: Date = new Date(),
): number {
  const zone = timeZone.trim() || "UTC";
  if (Number.isNaN(onDate.getTime())) {
    return 0;
  }
  return -Math.round(zoneOffsetMs(zone, onDate) / 60_000);
}

/**
 * Interpret `YYYY-MM-DD` + `HH:mm` as wall clock in `timeZone` and return the UTC Date.
 */
export function zonedLocalToUtc(
  dateYmd: string,
  timeHm: string,
  timeZone: string,
): Date {
  const dateMatch = DATE_PATTERN.exec(dateYmd.slice(0, 10));
  const timeMatch = TIME_PATTERN.exec(timeHm);
  if (!dateMatch || !timeMatch) {
    throw new Error(`Invalid local date/time: ${dateYmd} ${timeHm}`);
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const zone = timeZone.trim() || "UTC";

  // Probe: treat wall clock as UTC, then subtract the zone offset at that instant.
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utcMs = desiredAsUtc - zoneOffsetMs(zone, new Date(desiredAsUtc));
  // One refinement covers DST boundaries.
  utcMs = desiredAsUtc - zoneOffsetMs(zone, new Date(utcMs));
  return new Date(utcMs);
}
