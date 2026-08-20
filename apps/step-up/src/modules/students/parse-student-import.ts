import type { Gender } from "@/lib/constants";

export type StudentImportRow = {
  name: string;
  email: string;
  gender: Gender;
  age: number | null;
  dateOfBirth: string | null;
  phone: string | null;
  guardianName: string | null;
  alternateMobile: string | null;
};

export type ParseStudentImportResult = {
  students: StudentImportRow[];
  invalidRows: number[];
};

export const STUDENT_IMPORT_MAX = 500;
export const STUDENT_IMPORT_MIN_AGE = 0;
export const STUDENT_IMPORT_MAX_AGE = 120;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Primary Excel date format: dd/mm/yyyy (also dd-mm-yyyy). */
const DMY_DATE_PATTERN = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
/** Also accepted; always normalized to this for the API payload. */
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const GENDER_ALIASES: Record<string, Gender> = {
  female: "FEMALE",
  f: "FEMALE",
  male: "MALE",
  m: "MALE",
};

function cellText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function normalizeHeader(value: unknown) {
  return cellText(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function parseGender(value: unknown): Gender | null {
  const raw = cellText(value);
  if (!raw) return null;
  const key = raw.toLowerCase();
  if (key === "female" || key === "male") {
    return key.toUpperCase() as Gender;
  }
  return GENDER_ALIASES[key] ?? null;
}

function parsePhone(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  const raw = cellText(value);
  return raw || null;
}

function parseAge(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) &&
      value >= STUDENT_IMPORT_MIN_AGE &&
      value <= STUDENT_IMPORT_MAX_AGE
      ? value
      : null;
  }

  const raw = cellText(value);
  if (!raw || !/^\d+$/.test(raw)) {
    return null;
  }

  const age = Number(raw);
  if (age < STUDENT_IMPORT_MIN_AGE || age > STUDENT_IMPORT_MAX_AGE) {
    return null;
  }
  return age;
}

function isPastCalendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return date <= today;
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

/** Keep Excel date cells on the calendar day (avoid toISOString day-shift). */
function formatCalendarDate(value: Date): string | null {
  const useLocal = isLocalMidnight(value) || !isUtcMidnight(value);
  const year = useLocal ? value.getFullYear() : value.getUTCFullYear();
  const month = (useLocal ? value.getMonth() : value.getUTCMonth()) + 1;
  const day = useLocal ? value.getDate() : value.getUTCDate();
  if (!isPastCalendarDate(year, month, day)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateOfBirth(value: unknown): string | null {
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
    return isPastCalendarDate(year, month, day)
      ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }

  match = ISO_DATE_PATTERN.exec(raw);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return isPastCalendarDate(year, month, day) ? raw : null;
  }

  return null;
}

function findColumnIndex(headers: string[], aliases: string[]) {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

export function formatStudentImportRowList(rows: number[]) {
  if (rows.length <= 8) {
    return rows.join(", ");
  }
  return `${rows.slice(0, 8).join(", ")}, and ${rows.length - 8} more`;
}

export function parseStudentImportRows(
  rows: unknown[][],
): ParseStudentImportResult {
  if (rows.length < 2) {
    throw new Error(
      "The spreadsheet must include a header and at least one student.",
    );
  }

  const headerRow = rows[0];
  if (!headerRow) {
    throw new Error("The spreadsheet does not contain a header row.");
  }

  const headers = headerRow.map((cell) => normalizeHeader(cell));
  const nameIndex = findColumnIndex(headers, ["name"]);
  const emailIndex = findColumnIndex(headers, ["email"]);
  const genderIndex = findColumnIndex(headers, ["gender"]);
  const ageIndex = findColumnIndex(headers, ["age"]);
  const dateOfBirthIndex = findColumnIndex(headers, [
    "date of birth",
    "dob",
    "birth date",
    "birthday",
  ]);
  const phoneIndex = findColumnIndex(headers, [
    "mobile",
    "mobile no",
    "mobile number",
    "phone",
    "phone number",
  ]);
  const guardianNameIndex = findColumnIndex(headers, [
    "guardian name",
    "guardian",
  ]);
  const alternateMobileIndex = findColumnIndex(headers, [
    "alternate mobile",
    "alternate mobile number",
    "alternate phone",
    "alternate number",
  ]);

  if (nameIndex === -1 || emailIndex === -1 || genderIndex === -1) {
    throw new Error(
      'The first row must contain "Name", "Email", and "Gender" columns.',
    );
  }
  if (ageIndex === -1 && dateOfBirthIndex === -1) {
    throw new Error(
      'The first row must contain an "Age" or "Date of birth" column.',
    );
  }

  const students: StudentImportRow[] = [];
  const seenEmails = new Set<string>();
  const invalidRows: number[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const name = cellText(row?.[nameIndex]);
    const email = cellText(row?.[emailIndex]).toLowerCase();
    const gender = parseGender(row?.[genderIndex]);
    const age = ageIndex === -1 ? null : parseAge(row?.[ageIndex]);
    const dateOfBirth =
      dateOfBirthIndex === -1
        ? null
        : parseDateOfBirth(row?.[dateOfBirthIndex]);
    const phone = phoneIndex === -1 ? null : parsePhone(row?.[phoneIndex]);
    const guardianName =
      guardianNameIndex === -1
        ? null
        : cellText(row?.[guardianNameIndex]) || null;
    const alternateMobile =
      alternateMobileIndex === -1
        ? null
        : parsePhone(row?.[alternateMobileIndex]);

    if (
      !name &&
      !email &&
      !gender &&
      age === null &&
      dateOfBirth === null &&
      !phone &&
      !guardianName &&
      !alternateMobile
    ) {
      continue;
    }

    if (
      !name ||
      !EMAIL_PATTERN.test(email) ||
      !gender ||
      (age === null && dateOfBirth === null)
    ) {
      invalidRows.push(index + 2);
      continue;
    }

    if (!seenEmails.has(email)) {
      seenEmails.add(email);
      students.push({
        name,
        email,
        gender,
        age,
        dateOfBirth,
        phone,
        guardianName,
        alternateMobile,
      });
    }
  }

  if (students.length === 0) {
    if (invalidRows.length > 0) {
      throw new Error(
        `No valid students found. Fix missing names, invalid emails, gender, or missing age/date of birth in row${invalidRows.length === 1 ? "" : "s"} ${formatStudentImportRowList(invalidRows)}, then re-upload.`,
      );
    }
    throw new Error("No valid students were found in the spreadsheet.");
  }

  if (students.length > STUDENT_IMPORT_MAX) {
    throw new Error(`Import up to ${STUDENT_IMPORT_MAX} students at a time.`);
  }

  return { students, invalidRows };
}
