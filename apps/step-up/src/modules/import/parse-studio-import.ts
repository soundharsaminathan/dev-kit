import {
  parseStudentImportRows,
  type StudentImportRow,
} from "@/modules/students/parse-student-import";

export type BatchCategory = "KIDS" | "ADULTS";
export type EnrollmentMode = "STAFF_ONLY" | "SELF_JOIN";
export type ImportBatchDayTime = {
  weekday: number;
  startTime: string;
  endTime: string;
};
export type ImportBatchRow = {
  name: string;
  category: BatchCategory;
  branchName: string | null;
  danceStyles: string[];
  frequency: "DAILY" | "WEEKLY";
  weekdays: number[];
  startTime: string;
  endTime: string;
  dayTimes?: ImportBatchDayTime[];
  startDate: string;
  endDate: string;
  utcOffsetMinutes: number | null;
  capacity: number;
  enrollmentMode: EnrollmentMode;
  active: boolean;
  monthlyPlanName: string | null;
  quarterlyPlanName: string | null;
};

export type ImportEnrollmentRow = {
  studentEmail: string;
  batchName: string;
  enrolledAt: string;
  status: "ACTIVE" | "ENDED";
  endedAt: string | null;
  endReason: string | null;
  planName: string | null;
};

export type ImportInvoiceRow = {
  studentEmail: string;
  batchName: string | null;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
  paymentMethod: "CASH" | "UPI_MANUAL" | "RAZORPAY" | null;
  paidAt: string | null;
  referralDiscount: number;
  studioDiscount: number;
  refundedAmount: number;
  refundedAt: string | null;
  planName: string | null;
};

export type ImportSessionRow = {
  batchName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  type: "REGULAR" | "TRIAL";
  trainerEmail: string | null;
};

export type ImportAttendanceRow = {
  batchName: string;
  studentEmail: string;
  date: string;
  startTime: string | null;
  status: "PRESENT" | "ABSENT";
};

export type OpeningHoursDay = {
  day: number;
  closed?: boolean;
  open?: string;
  close?: string;
};

export type OpeningHours = {
  timezone?: string;
  days?: OpeningHoursDay[];
  notes?: string;
};

export type ImportLocationRow = {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  amenities: string[];
  openingHours: OpeningHours | null;
  pricingBlurb: string | null;
};

export type StudioSheetKind =
  | "students"
  | "locations"
  | "batches"
  | "enrollments"
  | "sessions"
  | "invoices"
  | "attendance";

export type StudioImportSheets = {
  students: unknown[][];
  locations: unknown[][];
  batches: unknown[][];
  enrollments: unknown[][];
  sessions: unknown[][];
  invoices: unknown[][];
  attendance: unknown[][];
};

export type ParseStudioImportResult = {
  found: Record<StudioSheetKind, boolean>;
  sheetErrors: Partial<Record<StudioSheetKind, string>>;
  crossSheetErrors: string[];
  students: StudentImportRow[];
  studentsInvalidRows: number[];
  locations: ImportLocationRow[];
  locationsInvalidRows: number[];
  batches: ImportBatchRow[];
  batchesInvalidRows: number[];
  enrollments: ImportEnrollmentRow[];
  enrollmentsInvalidRows: number[];
  sessions: ImportSessionRow[];
  sessionsInvalidRows: number[];
  invoices: ImportInvoiceRow[];
  invoicesInvalidRows: number[];
  attendance: ImportAttendanceRow[];
  attendanceInvalidRows: number[];
};

export const LOCATION_IMPORT_MAX = 200;
export const BATCH_IMPORT_MAX = 500;
export const ENROLLMENT_IMPORT_MAX = 5_000;
export const SESSION_IMPORT_MAX = 5_000;
export const INVOICE_IMPORT_MAX = 5_000;
export const ATTENDANCE_IMPORT_MAX = 5_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Primary Excel date format: dd/mm/yyyy (also dd-mm-yyyy). */
const DMY_DATE_PATTERN = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
/** Also accepted; always normalized to this for the API payload. */
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const CATEGORY_ALIASES: Record<string, BatchCategory> = {
  kids: "KIDS",
  kid: "KIDS",
  children: "KIDS",
  adults: "ADULTS",
  adult: "ADULTS",
};

const FREQUENCY_ALIASES: Record<string, "DAILY" | "WEEKLY"> = {
  daily: "DAILY",
  everyday: "DAILY",
  weekly: "WEEKLY",
};

const ENROLLMENT_MODE_ALIASES: Record<string, EnrollmentMode> = {
  "staff only": "STAFF_ONLY",
  "staff only enrollment": "STAFF_ONLY",
  staff: "STAFF_ONLY",
  staffonly: "STAFF_ONLY",
  "self join": "SELF_JOIN",
  "self enrollment": "SELF_JOIN",
  selfjoin: "SELF_JOIN",
  self: "SELF_JOIN",
};

const INVOICE_STATUS_ALIASES: Record<string, ImportInvoiceRow["status"]> = {
  paid: "PAID",
  pending: "PENDING",
  overdue: "OVERDUE",
  due: "OVERDUE",
  refunded: "REFUNDED",
};

const PAYMENT_METHOD_ALIASES: Record<
  string,
  NonNullable<ImportInvoiceRow["paymentMethod"]>
> = {
  cash: "CASH",
  upi: "UPI_MANUAL",
  "upi manual": "UPI_MANUAL",
  upimanual: "UPI_MANUAL",
  razorpay: "RAZORPAY",
  "razor pay": "RAZORPAY",
  razorpayonline: "RAZORPAY",
  online: "RAZORPAY",
};

const ENROLLMENT_STATUS_ALIASES: Record<string, ImportEnrollmentRow["status"]> =
  {
    active: "ACTIVE",
    enrolled: "ACTIVE",
    ended: "ENDED",
    inactive: "ENDED",
    left: "ENDED",
  };

const ATTENDANCE_STATUS_ALIASES: Record<string, ImportAttendanceRow["status"]> =
  {
    present: "PRESENT",
    attended: "PRESENT",
    p: "PRESENT",
    absent: "ABSENT",
    missed: "ABSENT",
    a: "ABSENT",
  };

const SESSION_STATUS_ALIASES: Record<string, ImportSessionRow["status"]> = {
  scheduled: "SCHEDULED",
  planned: "SCHEDULED",
  upcoming: "SCHEDULED",
  completed: "COMPLETED",
  done: "COMPLETED",
  held: "COMPLETED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
};

const SESSION_TYPE_ALIASES: Record<string, ImportSessionRow["type"]> = {
  regular: "REGULAR",
  trial: "TRIAL",
  demo: "TRIAL",
};

const WEEKDAY_ALIASES: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const SHEET_ALIASES: Record<StudioSheetKind, string[]> = {
  students: ["students", "student", "members"],
  locations: ["locations", "location", "branches", "branch"],
  batches: ["batches", "batch", "classes"],
  enrollments: ["enrollments", "enrollment", "roster", "admissions"],
  sessions: ["sessions", "session", "classes held", "class list"],
  invoices: ["invoices", "invoice", "payments", "payment", "billing", "fees"],
  attendance: ["attendance", "attendance log", "attendance register"],
};

function cellText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function normalizeHeader(value: unknown) {
  return cellText(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function normalizeSheetName(value: unknown) {
  return cellText(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findColumnIndex(headers: string[], aliases: string[]) {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

function isRealDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isUtcMidnight(value: Date): boolean {
  return (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

function isLocalMidnight(value: Date): boolean {
  return (
    value.getHours() === 0 &&
    value.getMinutes() === 0 &&
    value.getSeconds() === 0 &&
    value.getMilliseconds() === 0
  );
}

/**
 * Spreadsheet date cells are calendar days. Local midnight (common from Excel
 * in the browser) must not go through `toISOString` — in positive UTC offsets
 * that turns Aug 1 into Jul 31, so gap invoices start a month early.
 */
function formatCalendarDate(value: Date): string | null {
  const useLocal = isLocalMidnight(value) || !isUtcMidnight(value);
  const year = useLocal ? value.getFullYear() : value.getUTCFullYear();
  const month = (useLocal ? value.getMonth() : value.getUTCMonth()) + 1;
  const day = useLocal ? value.getDate() : value.getUTCDate();
  return isRealDate(year, month, day)
    ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

/** Calendar date → YYYY-MM-DD for the API. Excel text dates use dd/mm/yyyy. */
function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatCalendarDate(value);
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + Math.trunc(value) * 86_400_000);
    return formatCalendarDate(date);
  }

  const raw = cellText(value);
  if (!raw) return null;

  let match = DMY_DATE_PATTERN.exec(raw);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    return isRealDate(year, month, day)
      ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }

  match = ISO_DATE_PATTERN.exec(raw);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return isRealDate(year, month, day) ? raw : null;
  }

  return null;
}

/** HH:MM (24h) from time cells, "9:00 AM/PM" strings, or Excel time values. */
function parseTime(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Wall clock in the browser (studio timezone), not UTC from toISOString.
    const hours = value.getHours();
    const minutes = value.getMinutes();
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const raw = cellText(value);
  if (!raw) return null;

  const match = /^(\d{1,2}):(\d{2})\s*([ap]m)?$/i.exec(raw);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const ampm = match[3]?.toLowerCase();
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  const normalized = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return TIME_PATTERN.test(normalized) ? normalized : null;
}

/** Strips currency symbols, spaces, and thousands separators before parsing. */
function parseMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  const raw = cellText(value).replace(/[^0-9.-]/g, "");
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100) / 100;
}

function parseInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : null;
  }
  const raw = cellText(value);
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Per-weekday slots like "Mon 16:00-17:00, Wed 18:00-19:00" or
 * "Mon-Wed 09:00-10:00" when several days share the same hours.
 */
function parseDayTimes(value: unknown): ImportBatchDayTime[] | null {
  const raw = cellText(value);
  if (!raw) return null;

  const segments = raw
    .split(/[,;]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const slots: ImportBatchDayTime[] = [];

  for (const segment of segments) {
    const match = /^([a-z]{3,9})(?:\s*-\s*([a-z]{3,9}))?\s+(\S+)-(\S+)$/i.exec(
      segment,
    );
    if (!match) return null;

    const startDay = WEEKDAY_ALIASES[match[1]!.toLowerCase()];
    if (startDay === undefined) return null;
    const endDay = match[2]
      ? WEEKDAY_ALIASES[match[2]!.toLowerCase()]
      : startDay;
    if (endDay === undefined || endDay < startDay) return null;

    const startTime = parseTime(match[3]);
    const endTime = parseTime(match[4]);
    if (!startTime || !endTime || endTime <= startTime) return null;

    for (let day = startDay; day <= endDay; day += 1) {
      slots.push({ weekday: day, startTime, endTime });
    }
  }

  if (slots.length === 0) return null;

  const byWeekday = new Map<number, ImportBatchDayTime>();
  for (const slot of slots) {
    byWeekday.set(slot.weekday, slot);
  }
  return [...byWeekday.values()].sort((a, b) => a.weekday - b.weekday);
}

function parseWeekdays(value: unknown): number[] | null {
  const raw = cellText(value);
  if (!raw) return [];
  const parts = raw.split(/[,\s]+/).filter(Boolean);
  if (parts.length === 0) return [];
  const days: number[] = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const day = Number(part);
      if (day < 0 || day > 6) return null;
      days.push(day);
      continue;
    }
    const alias = WEEKDAY_ALIASES[part.toLowerCase()];
    if (alias === undefined) return null;
    days.push(alias);
  }
  return [...new Set(days)].sort((a, b) => a - b);
}

function parseEnum<T extends string>(
  value: unknown,
  aliases: Record<string, T>,
): T | null {
  const raw = cellText(value);
  if (!raw) return null;
  const key = raw.toLowerCase();
  return aliases[key] ?? null;
}

function detectSheetKind(
  headers: string[],
  sheetName: string,
): StudioSheetKind | null {
  const headerSet = new Set(headers);
  const has = (aliases: string[]) =>
    aliases.some((alias) => headerSet.has(alias));

  if (has(["name"]) && has(["email"]) && has(["gender"])) {
    return "students";
  }
  if (has(["amount"]) && has(["status"])) {
    return "invoices";
  }
  if (
    has(["batch name", "batch"]) &&
    has(["student email", "email"]) &&
    has(["date", "attendance date", "class date", "session date"])
  ) {
    return "attendance";
  }
  if (
    has(["batch name", "batch"]) &&
    has(["date", "session date", "class date"]) &&
    has(["start time"])
  ) {
    return "sessions";
  }
  if (
    has(["location name", "branch name", "name", "location"]) &&
    has(["address"])
  ) {
    return "locations";
  }
  if (has(["batch name", "batch"]) && has(["student email", "email"])) {
    return "enrollments";
  }
  if (has(["batch name", "batch"]) && has(["category"])) {
    return "batches";
  }

  const name = normalizeSheetName(sheetName);
  for (const kind of [
    "students",
    "locations",
    "batches",
    "enrollments",
    "sessions",
    "invoices",
    "attendance",
  ] as const) {
    const aliases = SHEET_ALIASES[kind];
    if (aliases.some((alias) => name === alias)) {
      return kind;
    }
  }
  const tokens = name.split(" ");
  for (const kind of [
    "students",
    "locations",
    "batches",
    "enrollments",
    "sessions",
    "invoices",
    "attendance",
  ] as const) {
    if (SHEET_ALIASES[kind].some((alias) => tokens.includes(alias))) {
      return kind;
    }
  }
  return null;
}

function parseBatchesSheet(rows: unknown[][]): {
  batches: ImportBatchRow[];
  invalidRows: number[];
} {
  const headerRow = rows[0];
  if (!headerRow || rows.length < 2) {
    return { batches: [], invalidRows: [] };
  }
  const headers = headerRow.map((cell) => normalizeHeader(cell));
  const nameIndex = findColumnIndex(headers, ["batch name", "batch"]);
  const categoryIndex = findColumnIndex(headers, [
    "category",
    "batch category",
  ]);
  const branchNameIndex = findColumnIndex(headers, ["branch name", "branch"]);
  const danceStylesIndex = findColumnIndex(headers, [
    "dance styles",
    "dance style",
    "styles",
    "style",
    "dance categories",
  ]);
  const frequencyIndex = findColumnIndex(headers, [
    "frequency",
    "schedule frequency",
  ]);
  const weekdaysIndex = findColumnIndex(headers, [
    "weekdays",
    "days",
    "days of week",
  ]);
  const startTimeIndex = findColumnIndex(headers, ["start time"]);
  const endTimeIndex = findColumnIndex(headers, ["end time"]);
  const dayTimesIndex = findColumnIndex(headers, [
    "day times",
    "day time",
    "schedule times",
    "weekly times",
  ]);
  const startDateIndex = findColumnIndex(headers, ["start date"]);
  const endDateIndex = findColumnIndex(headers, ["end date"]);
  const utcOffsetIndex = findColumnIndex(headers, [
    "utc offset minutes",
    "utc offset",
    "timezone offset",
  ]);
  const capacityIndex = findColumnIndex(headers, ["capacity", "seats"]);
  const enrollmentModeIndex = findColumnIndex(headers, [
    "enrollment mode",
    "enrollment",
  ]);
  const statusIndex = findColumnIndex(headers, ["status", "state"]);
  const monthlyPlanIndex = findColumnIndex(headers, [
    "monthly plan name",
    "monthly plan",
    "1 month plan",
    "1-month plan",
  ]);
  const quarterlyPlanIndex = findColumnIndex(headers, [
    "quarterly plan name",
    "quarterly plan",
    "3 month plan",
    "3-month plan",
  ]);

  if (nameIndex === -1 || categoryIndex === -1) {
    throw new Error(
      'The "Batches" sheet must contain "Batch name" and "Category" columns.',
    );
  }

  const batches: ImportBatchRow[] = [];
  const invalidRows: number[] = [];
  const seenNames = new Set<string>();

  for (const [index, row] of rows.slice(1).entries()) {
    const name = cellText(row?.[nameIndex]);
    const category = parseEnum(row?.[categoryIndex], CATEGORY_ALIASES);
    const branchName =
      branchNameIndex === -1 ? null : cellText(row?.[branchNameIndex]) || null;
    const danceStyles =
      danceStylesIndex === -1
        ? []
        : cellText(row?.[danceStylesIndex])
            .split(",")
            .map((style) => style.trim())
            .filter(Boolean);
    const frequency =
      frequencyIndex === -1
        ? ("WEEKLY" as const)
        : (parseEnum(row?.[frequencyIndex], FREQUENCY_ALIASES) ?? "WEEKLY");
    const rawDayTimes =
      dayTimesIndex === -1 ? null : parseDayTimes(row?.[dayTimesIndex]);
    if (dayTimesIndex !== -1 && cellText(row?.[dayTimesIndex]) && !rawDayTimes) {
      invalidRows.push(index + 2);
      continue;
    }

    const weekdaysFromColumn =
      weekdaysIndex === -1 ? null : parseWeekdays(row?.[weekdaysIndex]);
    if (weekdaysIndex !== -1 && weekdaysFromColumn === null) {
      invalidRows.push(index + 2);
      continue;
    }

    const dayTimes =
      rawDayTimes && rawDayTimes.length > 0 ? rawDayTimes : undefined;
    const weekdays = dayTimes
      ? dayTimes.map((slot) => slot.weekday)
      : weekdaysIndex === -1
        ? [1, 3, 5]
        : (weekdaysFromColumn ?? []);
    if (weekdays.length === 0) {
      invalidRows.push(index + 2);
      continue;
    }
    if (
      dayTimes &&
      weekdaysIndex !== -1 &&
      weekdaysFromColumn &&
      weekdaysFromColumn.length > 0 &&
      (weekdaysFromColumn.length !== weekdays.length ||
        weekdaysFromColumn.some((day, index) => day !== weekdays[index]))
    ) {
      invalidRows.push(index + 2);
      continue;
    }

    const startTime =
      startTimeIndex === -1
        ? (dayTimes?.[0]?.startTime ?? "09:00")
        : (parseTime(row?.[startTimeIndex]) ??
          dayTimes?.[0]?.startTime ??
          "09:00");
    const endTime =
      endTimeIndex === -1
        ? (dayTimes?.[0]?.endTime ?? "10:00")
        : (parseTime(row?.[endTimeIndex]) ??
          dayTimes?.[0]?.endTime ??
          "10:00");
    const startDate =
      startDateIndex === -1 ? null : parseDate(row?.[startDateIndex]);
    const endDate = endDateIndex === -1 ? null : parseDate(row?.[endDateIndex]);
    const utcOffset =
      utcOffsetIndex === -1
        ? null
        : (parseInteger(row?.[utcOffsetIndex]) ?? null);
    const capacity =
      capacityIndex === -1 ? 20 : (parseInteger(row?.[capacityIndex]) ?? null);
    const enrollmentMode =
      enrollmentModeIndex === -1
        ? ("STAFF_ONLY" as const)
        : (parseEnum(row?.[enrollmentModeIndex], ENROLLMENT_MODE_ALIASES) ??
          "STAFF_ONLY");
    const rawStatus = statusIndex === -1 ? "" : cellText(row?.[statusIndex]);
    const active =
      !rawStatus || /^(active|ended|inactive)$/i.test(rawStatus)
        ? !/^(ended|inactive)$/i.test(rawStatus)
        : true;
    const monthlyPlanName =
      monthlyPlanIndex === -1
        ? null
        : cellText(row?.[monthlyPlanIndex]) || null;
    const quarterlyPlanName =
      quarterlyPlanIndex === -1
        ? null
        : cellText(row?.[quarterlyPlanIndex]) || null;

    if (
      !name &&
      !category &&
      !branchName &&
      danceStyles.length === 0 &&
      !startDate &&
      !endDate &&
      !monthlyPlanName &&
      !quarterlyPlanName
    ) {
      continue;
    }

    if (
      !name ||
      !category ||
      capacity === null ||
      capacity < 1 ||
      capacity > 10_000
    ) {
      invalidRows.push(index + 2);
      continue;
    }
    if (
      (monthlyPlanName && !quarterlyPlanName) ||
      (!monthlyPlanName && quarterlyPlanName)
    ) {
      invalidRows.push(index + 2);
      continue;
    }
    if (!dayTimes && endTime <= startTime) {
      invalidRows.push(index + 2);
      continue;
    }
    if ((startDate && !endDate) || (!startDate && endDate)) {
      invalidRows.push(index + 2);
      continue;
    }
    if (startDate && endDate && endDate < startDate) {
      invalidRows.push(index + 2);
      continue;
    }

    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      invalidRows.push(index + 2);
      continue;
    }
    seenNames.add(key);
    batches.push({
      name,
      category,
      branchName,
      danceStyles,
      frequency,
      weekdays,
      startTime,
      endTime,
      ...(dayTimes ? { dayTimes } : {}),
      startDate: startDate ?? todayIso(),
      endDate: endDate ?? todayIso(),
      utcOffsetMinutes:
        utcOffset !== null && utcOffset >= -840 && utcOffset <= 840
          ? utcOffset
          : null,
      capacity,
      enrollmentMode,
      active,
      monthlyPlanName,
      quarterlyPlanName,
    });
  }

  if (batches.length > BATCH_IMPORT_MAX) {
    throw new Error(`Import up to ${BATCH_IMPORT_MAX} batches at a time.`);
  }
  return { batches, invalidRows };
}

function todayIso() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function parseEnrollmentsSheet(rows: unknown[][]): {
  enrollments: ImportEnrollmentRow[];
  invalidRows: number[];
} {
  const headerRow = rows[0];
  if (!headerRow || rows.length < 2) {
    return { enrollments: [], invalidRows: [] };
  }
  const headers = headerRow.map((cell) => normalizeHeader(cell));
  const studentEmailIndex = findColumnIndex(headers, [
    "student email",
    "email",
    "student",
  ]);
  const batchNameIndex = findColumnIndex(headers, ["batch name", "batch"]);
  const enrolledAtIndex = findColumnIndex(headers, [
    "enrolled date",
    "enrollment date",
    "enrolled on",
    "date enrolled",
    "enrolled at",
  ]);
  const statusIndex = findColumnIndex(headers, ["status", "enrollment status"]);
  const endedAtIndex = findColumnIndex(headers, [
    "ended date",
    "end date",
    "ended on",
  ]);
  const endReasonIndex = findColumnIndex(headers, [
    "end reason",
    "reason",
    "note",
  ]);
  const planNameIndex = findColumnIndex(headers, [
    "plan name",
    "plan",
    "subscription",
    "subscription name",
  ]);

  if (
    studentEmailIndex === -1 ||
    batchNameIndex === -1 ||
    enrolledAtIndex === -1
  ) {
    throw new Error(
      'The "Enrollments" sheet must contain "Student email", "Batch name", and "Enrolled date" columns.',
    );
  }

  const enrollments: ImportEnrollmentRow[] = [];
  const invalidRows: number[] = [];
  const seen = new Set<string>();

  for (const [index, row] of rows.slice(1).entries()) {
    const studentEmail = cellText(row?.[studentEmailIndex]).toLowerCase();
    const batchName = cellText(row?.[batchNameIndex]);
    const enrolledAt = parseDate(row?.[enrolledAtIndex]);
    const status =
      statusIndex === -1
        ? ("ACTIVE" as const)
        : (parseEnum(row?.[statusIndex], ENROLLMENT_STATUS_ALIASES) ??
          "ACTIVE");
    const endedAt = endedAtIndex === -1 ? null : parseDate(row?.[endedAtIndex]);
    const endReason =
      endReasonIndex === -1 ? null : cellText(row?.[endReasonIndex]) || null;
    const planName =
      planNameIndex === -1 ? null : cellText(row?.[planNameIndex]) || null;

    if (
      !studentEmail &&
      !batchName &&
      !enrolledAt &&
      !endedAt &&
      !endReason &&
      !planName
    ) {
      continue;
    }

    if (
      !EMAIL_PATTERN.test(studentEmail) ||
      !batchName ||
      !enrolledAt ||
      (status === "ENDED" && (!endedAt || endedAt < enrolledAt))
    ) {
      invalidRows.push(index + 2);
      continue;
    }

    const pair = `${studentEmail}:${batchName.toLowerCase()}`;
    if (seen.has(pair)) {
      invalidRows.push(index + 2);
      continue;
    }
    seen.add(pair);
    enrollments.push({
      studentEmail,
      batchName,
      enrolledAt,
      status,
      endedAt,
      endReason,
      planName,
    });
  }

  if (enrollments.length > ENROLLMENT_IMPORT_MAX) {
    throw new Error(
      `Import up to ${ENROLLMENT_IMPORT_MAX} enrollments at a time.`,
    );
  }
  return { enrollments, invalidRows };
}

function parseInvoicesSheet(rows: unknown[][]): {
  invoices: ImportInvoiceRow[];
  invalidRows: number[];
} {
  const headerRow = rows[0];
  if (!headerRow || rows.length < 2) {
    return { invoices: [], invalidRows: [] };
  }
  const headers = headerRow.map((cell) => normalizeHeader(cell));
  const studentEmailIndex = findColumnIndex(headers, [
    "student email",
    "email",
    "student",
  ]);
  const batchNameIndex = findColumnIndex(headers, [
    "batch name",
    "batch",
    "class",
  ]);
  const amountIndex = findColumnIndex(headers, [
    "amount",
    "price",
    "total",
    "fees",
  ]);
  const statusIndex = findColumnIndex(headers, [
    "status",
    "invoice status",
    "payment status",
  ]);
  const paymentMethodIndex = findColumnIndex(headers, [
    "payment method",
    "method",
    "mode",
    "mode of payment",
  ]);
  const paidAtIndex = findColumnIndex(headers, [
    "paid date",
    "payment date",
    "paid on",
    "date paid",
  ]);
  const referralDiscountIndex = findColumnIndex(headers, [
    "referral discount",
    "referral",
  ]);
  const studioDiscountIndex = findColumnIndex(headers, [
    "studio discount",
    "discount",
    "discounts",
  ]);
  const refundedAmountIndex = findColumnIndex(headers, [
    "refunded amount",
    "refund amount",
    "refund",
  ]);
  const refundedAtIndex = findColumnIndex(headers, [
    "refunded date",
    "refund date",
    "refunded on",
  ]);
  const planNameIndex = findColumnIndex(headers, [
    "plan name",
    "plan",
    "subscription",
    "subscription name",
  ]);

  if (studentEmailIndex === -1 || amountIndex === -1 || statusIndex === -1) {
    throw new Error(
      'The "Invoices & Payments" sheet must contain "Student email", "Amount", and "Status" columns.',
    );
  }

  const invoices: ImportInvoiceRow[] = [];
  const invalidRows: number[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const studentEmail = cellText(row?.[studentEmailIndex]).toLowerCase();
    const batchName =
      batchNameIndex === -1 ? null : cellText(row?.[batchNameIndex]) || null;
    const amount = parseMoney(row?.[amountIndex]);
    const status = parseEnum(row?.[statusIndex], INVOICE_STATUS_ALIASES);
    const paymentMethod =
      paymentMethodIndex === -1
        ? null
        : parseEnum(row?.[paymentMethodIndex], PAYMENT_METHOD_ALIASES);
    const paidAt = paidAtIndex === -1 ? null : parseDate(row?.[paidAtIndex]);
    const referralDiscount =
      referralDiscountIndex === -1
        ? 0
        : (parseMoney(row?.[referralDiscountIndex]) ?? 0);
    const studioDiscount =
      studioDiscountIndex === -1
        ? 0
        : (parseMoney(row?.[studioDiscountIndex]) ?? 0);
    const refundedAmount =
      refundedAmountIndex === -1
        ? null
        : parseMoney(row?.[refundedAmountIndex]);
    const refundedAt =
      refundedAtIndex === -1 ? null : parseDate(row?.[refundedAtIndex]);
    const planName =
      planNameIndex === -1 ? null : cellText(row?.[planNameIndex]) || null;

    if (
      !studentEmail &&
      !batchName &&
      amount === null &&
      !status &&
      !paidAt &&
      !planName
    ) {
      continue;
    }

    if (
      !EMAIL_PATTERN.test(studentEmail) ||
      amount === null ||
      amount <= 0 ||
      !status
    ) {
      invalidRows.push(index + 2);
      continue;
    }
    if (status === "PAID" && !paidAt) {
      invalidRows.push(index + 2);
      continue;
    }

    invoices.push({
      studentEmail,
      batchName,
      amount,
      status,
      paymentMethod,
      paidAt,
      referralDiscount,
      studioDiscount,
      refundedAmount: refundedAmount ?? (status === "REFUNDED" ? amount : 0),
      refundedAt,
      planName,
    });
  }

  if (invoices.length > INVOICE_IMPORT_MAX) {
    throw new Error(`Import up to ${INVOICE_IMPORT_MAX} invoices at a time.`);
  }
  return { invoices, invalidRows };
}

/**
 * Parses compact opening-hours text like "Mon-Fri 09:00-18:00, Sun closed"
 * into the structured shape used by branch pages. Unparseable text is kept
 * as notes instead of being dropped.
 */
function parseOpeningHours(value: unknown): OpeningHours | null {
  const raw = cellText(value);
  if (!raw) return null;

  const segments = raw
    .split(/[,;]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const days: OpeningHoursDay[] = [];
  let parsed = true;

  for (const segment of segments) {
    const closed = /^([a-z]{3,9})\s+(closed|off|holiday)$/i.exec(segment);
    if (closed) {
      const day = WEEKDAY_ALIASES[closed[1]!.toLowerCase()];
      if (day === undefined) {
        parsed = false;
        break;
      }
      days.push({ day, closed: true });
      continue;
    }

    const match = /^([a-z]{3,9})(?:\s*-\s*([a-z]{3,9}))?\s+(\S+)-(\S+)$/i.exec(
      segment,
    );
    if (!match) {
      parsed = false;
      break;
    }
    const startDay = WEEKDAY_ALIASES[match[1]!.toLowerCase()];
    if (startDay === undefined) {
      parsed = false;
      break;
    }
    const endDay = match[2]
      ? WEEKDAY_ALIASES[match[2]!.toLowerCase()]
      : startDay;
    if (endDay === undefined || endDay < startDay) {
      parsed = false;
      break;
    }
    const open = parseTime(match[3]);
    const close = parseTime(match[4]);
    if (!open || !close) {
      parsed = false;
      break;
    }
    for (let day = startDay; day <= endDay; day += 1) {
      days.push({ day, open, close });
    }
  }

  if (parsed && days.length > 0) {
    return { days: days.sort((a, b) => a.day - b.day) };
  }
  return { notes: raw };
}

function parseLocationsSheet(rows: unknown[][]): {
  locations: ImportLocationRow[];
  invalidRows: number[];
} {
  const headerRow = rows[0];
  if (!headerRow || rows.length < 2) {
    return { locations: [], invalidRows: [] };
  }
  const headers = headerRow.map((cell) => normalizeHeader(cell));
  const nameIndex = findColumnIndex(headers, [
    "location name",
    "branch name",
    "name",
    "location",
  ]);
  const addressIndex = findColumnIndex(headers, [
    "address",
    "street address",
    "location address",
  ]);
  const latitudeIndex = findColumnIndex(headers, ["latitude", "lat"]);
  const longitudeIndex = findColumnIndex(headers, [
    "longitude",
    "lon",
    "lng",
    "long",
  ]);
  const descriptionIndex = findColumnIndex(headers, [
    "description",
    "about",
    "details",
  ]);
  const amenitiesIndex = findColumnIndex(headers, [
    "amenities",
    "facilities",
    "features",
  ]);
  const openingHoursIndex = findColumnIndex(headers, [
    "opening hours",
    "hours",
    "timings",
    "open hours",
  ]);
  const pricingBlurbIndex = findColumnIndex(headers, [
    "pricing blurb",
    "pricing",
    "price note",
  ]);

  if (nameIndex === -1) {
    throw new Error(
      'The "Locations" sheet must contain a "Location name" column.',
    );
  }

  const locations: ImportLocationRow[] = [];
  const invalidRows: number[] = [];
  const seenNames = new Set<string>();

  for (const [index, row] of rows.slice(1).entries()) {
    const name = cellText(row?.[nameIndex]);
    const address =
      addressIndex === -1 ? null : cellText(row?.[addressIndex]) || null;
    const latitude =
      latitudeIndex === -1 ? null : parseLatLng(row?.[latitudeIndex], -90, 90);
    const longitude =
      longitudeIndex === -1
        ? null
        : parseLatLng(row?.[longitudeIndex], -180, 180);
    const description =
      descriptionIndex === -1
        ? null
        : cellText(row?.[descriptionIndex]) || null;
    const amenities =
      amenitiesIndex === -1
        ? []
        : cellText(row?.[amenitiesIndex])
            .split(/[,;]/)
            .map((amenity) => amenity.trim())
            .filter(Boolean);
    const openingHours =
      openingHoursIndex === -1
        ? null
        : parseOpeningHours(row?.[openingHoursIndex]);
    const pricingBlurb =
      pricingBlurbIndex === -1
        ? null
        : cellText(row?.[pricingBlurbIndex]) || null;

    if (
      !name &&
      !address &&
      latitude === null &&
      longitude === null &&
      !description &&
      amenities.length === 0 &&
      !openingHours &&
      !pricingBlurb
    ) {
      continue;
    }

    if (!name) {
      invalidRows.push(index + 2);
      continue;
    }

    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      invalidRows.push(index + 2);
      continue;
    }
    seenNames.add(key);
    locations.push({
      name,
      address,
      latitude,
      longitude,
      description,
      amenities,
      openingHours,
      pricingBlurb,
    });
  }

  if (locations.length > LOCATION_IMPORT_MAX) {
    throw new Error(`Import up to ${LOCATION_IMPORT_MAX} locations at a time.`);
  }
  return { locations, invalidRows };
}

function parseLatLng(value: unknown, min: number, max: number): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= min && value <= max ? value : null;
  }
  const raw = cellText(value).replace(/[^\d.-]/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return Math.round(parsed * 10_000) / 10_000;
}

function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours! * 60 + mins!;
}

function timePlusMinutes(time: string, minutes: number): string {
  const total = timeToMinutes(time) + minutes;
  const normalizedHours = Math.trunc(total / 60) % 24;
  const normalizedMinutes = total % 60;
  return `${String(normalizedHours).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")}`;
}

function parseSessionsSheet(rows: unknown[][]): {
  sessions: ImportSessionRow[];
  invalidRows: number[];
} {
  const headerRow = rows[0];
  if (!headerRow || rows.length < 2) {
    return { sessions: [], invalidRows: [] };
  }
  const headers = headerRow.map((cell) => normalizeHeader(cell));
  const batchNameIndex = findColumnIndex(headers, ["batch name", "batch"]);
  const dateIndex = findColumnIndex(headers, [
    "date",
    "session date",
    "class date",
  ]);
  const startTimeIndex = findColumnIndex(headers, ["start time"]);
  const endTimeIndex = findColumnIndex(headers, ["end time"]);
  const statusIndex = findColumnIndex(headers, ["status", "session status"]);
  const typeIndex = findColumnIndex(headers, ["type", "session type"]);
  const trainerEmailIndex = findColumnIndex(headers, [
    "trainer email",
    "trainer",
    "staff email",
  ]);

  if (batchNameIndex === -1 || dateIndex === -1 || startTimeIndex === -1) {
    throw new Error(
      'The "Sessions" sheet must contain "Batch name", "Date", and "Start time" columns.',
    );
  }

  const sessions: ImportSessionRow[] = [];
  const invalidRows: number[] = [];
  const seen = new Set<string>();

  for (const [index, row] of rows.slice(1).entries()) {
    const batchName = cellText(row?.[batchNameIndex]);
    const date = parseDate(row?.[dateIndex]);
    const startTime = parseTime(row?.[startTimeIndex]);
    const endTime = endTimeIndex === -1 ? null : parseTime(row?.[endTimeIndex]);
    const status =
      statusIndex === -1
        ? ("COMPLETED" as const)
        : (parseEnum(row?.[statusIndex], SESSION_STATUS_ALIASES) ??
          "COMPLETED");
    const type =
      typeIndex === -1
        ? ("REGULAR" as const)
        : (parseEnum(row?.[typeIndex], SESSION_TYPE_ALIASES) ?? "REGULAR");
    const trainerEmail =
      trainerEmailIndex === -1
        ? null
        : cellText(row?.[trainerEmailIndex]).toLowerCase() || null;

    if (!batchName && !date && !startTime && !endTime && !trainerEmail) {
      continue;
    }

    if (
      !batchName ||
      !date ||
      !startTime ||
      (trainerEmail && !EMAIL_PATTERN.test(trainerEmail))
    ) {
      invalidRows.push(index + 2);
      continue;
    }
    const resolvedEndTime = endTime ?? timePlusMinutes(startTime, 60);
    if (endTime && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      invalidRows.push(index + 2);
      continue;
    }

    const key = `${batchName.toLowerCase()}:${date}:${startTime}`;
    if (seen.has(key)) {
      invalidRows.push(index + 2);
      continue;
    }

    const overlapsExisting = sessions.some(
      (session) =>
        session.batchName.toLowerCase() === batchName.toLowerCase() &&
        session.date === date &&
        timeToMinutes(startTime) < timeToMinutes(session.endTime) &&
        timeToMinutes(resolvedEndTime) > timeToMinutes(session.startTime),
    );
    if (overlapsExisting) {
      invalidRows.push(index + 2);
      continue;
    }

    seen.add(key);
    sessions.push({
      batchName,
      date,
      startTime,
      endTime: resolvedEndTime,
      status,
      type,
      trainerEmail,
    });
  }

  if (sessions.length > SESSION_IMPORT_MAX) {
    throw new Error(`Import up to ${SESSION_IMPORT_MAX} sessions at a time.`);
  }
  return { sessions, invalidRows };
}

function parseAttendanceSheet(rows: unknown[][]): {
  attendance: ImportAttendanceRow[];
  invalidRows: number[];
} {
  const headerRow = rows[0];
  if (!headerRow || rows.length < 2) {
    return { attendance: [], invalidRows: [] };
  }
  const headers = headerRow.map((cell) => normalizeHeader(cell));
  const batchNameIndex = findColumnIndex(headers, ["batch name", "batch"]);
  const studentEmailIndex = findColumnIndex(headers, [
    "student email",
    "email",
    "student",
  ]);
  const dateIndex = findColumnIndex(headers, [
    "date",
    "attendance date",
    "class date",
    "session date",
  ]);
  const startTimeIndex = findColumnIndex(headers, [
    "start time",
    "time",
    "session time",
  ]);
  const statusIndex = findColumnIndex(headers, ["status", "attendance status"]);

  if (batchNameIndex === -1 || studentEmailIndex === -1 || dateIndex === -1) {
    throw new Error(
      'The "Attendance" sheet must contain "Batch name", "Student email", and "Date" columns.',
    );
  }

  const attendance: ImportAttendanceRow[] = [];
  const invalidRows: number[] = [];
  const seen = new Set<string>();

  for (const [index, row] of rows.slice(1).entries()) {
    const batchName = cellText(row?.[batchNameIndex]);
    const studentEmail = cellText(row?.[studentEmailIndex]).toLowerCase();
    const date = parseDate(row?.[dateIndex]);
    const startTime =
      startTimeIndex === -1 ? null : parseTime(row?.[startTimeIndex]);
    const status =
      statusIndex === -1
        ? ("PRESENT" as const)
        : (parseEnum(row?.[statusIndex], ATTENDANCE_STATUS_ALIASES) ??
          "PRESENT");

    if (!batchName && !studentEmail && !date) {
      continue;
    }

    if (!batchName || !EMAIL_PATTERN.test(studentEmail) || !date) {
      invalidRows.push(index + 2);
      continue;
    }

    const key = `${batchName.toLowerCase()}:${studentEmail}:${date}:${startTime ?? ""}`;
    if (seen.has(key)) {
      invalidRows.push(index + 2);
      continue;
    }
    seen.add(key);
    attendance.push({ batchName, studentEmail, date, startTime, status });
  }

  if (attendance.length > ATTENDANCE_IMPORT_MAX) {
    throw new Error(
      `Import up to ${ATTENDANCE_IMPORT_MAX} attendance rows at a time.`,
    );
  }
  return { attendance, invalidRows };
}

export function formatImportRowList(rows: number[]) {
  if (rows.length <= 8) {
    return rows.join(", ");
  }
  return `${rows.slice(0, 8).join(", ")}, and ${rows.length - 8} more`;
}

export function collectOneBatchErrors(input: {
  batches: Array<{ name: string }>;
  enrollments: Array<{ batchName: string }>;
  sessions: Array<{ batchName: string }>;
  invoices: Array<{ batchName: string | null }>;
  attendance: Array<{ batchName: string; startTime: string | null }>;
}): string[] {
  const errors: string[] = [];
  if (input.batches.length > 1) {
    errors.push(
      "Import one batch at a time. The Batches sheet must have a single batch row.",
    );
  }

  const names = new Set<string>();
  if (input.batches.length === 1) {
    names.add(input.batches[0]!.name.trim().toLowerCase());
  }
  for (const row of input.enrollments) {
    names.add(row.batchName.trim().toLowerCase());
  }
  for (const row of input.sessions) {
    names.add(row.batchName.trim().toLowerCase());
  }
  for (const row of input.attendance) {
    names.add(row.batchName.trim().toLowerCase());
  }
  for (const row of input.invoices) {
    if (row.batchName?.trim()) {
      names.add(row.batchName.trim().toLowerCase());
    }
  }
  if (names.size > 1) {
    errors.push(
      "Import one batch at a time. All rows must use the same batch name.",
    );
  }

  const missingStartTime = input.attendance.filter((row) => !row.startTime);
  if (missingStartTime.length > 0) {
    errors.push(
      "Attendance rows need a Start time that matches a Sessions row in this workbook.",
    );
  }

  return errors;
}

export function parseStudioImportSheets(
  sheets: Array<{ sheet: string; data: unknown[][] }>,
): ParseStudioImportResult {
  const found: Record<StudioSheetKind, boolean> = {
    students: false,
    locations: false,
    batches: false,
    enrollments: false,
    sessions: false,
    invoices: false,
    attendance: false,
  };
  const sheetErrors: Partial<Record<StudioSheetKind, string>> = {};
  const students: StudentImportRow[] = [];
  const studentsInvalidRows: number[] = [];
  const locations: ImportLocationRow[] = [];
  const locationsInvalidRows: number[] = [];
  const batches: ImportBatchRow[] = [];
  const batchesInvalidRows: number[] = [];
  const enrollments: ImportEnrollmentRow[] = [];
  const enrollmentsInvalidRows: number[] = [];
  const sessions: ImportSessionRow[] = [];
  const sessionsInvalidRows: number[] = [];
  const invoices: ImportInvoiceRow[] = [];
  const invoicesInvalidRows: number[] = [];
  const attendance: ImportAttendanceRow[] = [];
  const attendanceInvalidRows: number[] = [];

  for (const sheet of sheets) {
    const data = sheet.data ?? [];
    if (data.length < 1) continue;
    const headers = data[0]!.map((cell) => normalizeHeader(cell));
    const kind = detectSheetKind(headers, sheet.sheet);
    if (!kind || found[kind]) continue;

    found[kind] = true;
    try {
      if (kind === "students") {
        const result = parseStudentImportRows(data);
        students.push(...result.students);
        studentsInvalidRows.push(...result.invalidRows);
      } else if (kind === "locations") {
        const result = parseLocationsSheet(data);
        locations.push(...result.locations);
        locationsInvalidRows.push(...result.invalidRows);
      } else if (kind === "batches") {
        const result = parseBatchesSheet(data);
        batches.push(...result.batches);
        batchesInvalidRows.push(...result.invalidRows);
      } else if (kind === "enrollments") {
        const result = parseEnrollmentsSheet(data);
        enrollments.push(...result.enrollments);
        enrollmentsInvalidRows.push(...result.invalidRows);
      } else if (kind === "sessions") {
        const result = parseSessionsSheet(data);
        sessions.push(...result.sessions);
        sessionsInvalidRows.push(...result.invalidRows);
      } else if (kind === "attendance") {
        const result = parseAttendanceSheet(data);
        attendance.push(...result.attendance);
        attendanceInvalidRows.push(...result.invalidRows);
      } else {
        const result = parseInvoicesSheet(data);
        invoices.push(...result.invoices);
        invoicesInvalidRows.push(...result.invalidRows);
      }
    } catch (error) {
      sheetErrors[kind] =
        error instanceof Error ? error.message : "Unable to read this sheet.";
    }
  }

  const crossSheetErrors = collectOneBatchErrors({
    batches,
    enrollments,
    sessions,
    invoices,
    attendance,
  });

  return {
    found,
    sheetErrors,
    crossSheetErrors,
    students,
    studentsInvalidRows,
    locations,
    locationsInvalidRows,
    batches,
    batchesInvalidRows,
    enrollments,
    enrollmentsInvalidRows,
    sessions,
    sessionsInvalidRows,
    invoices,
    invoicesInvalidRows,
    attendance,
    attendanceInvalidRows,
  };
}
