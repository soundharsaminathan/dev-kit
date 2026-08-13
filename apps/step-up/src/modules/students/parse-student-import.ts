import type { Gender } from "@/lib/constants";

export type StudentImportRow = {
  name: string;
  email: string;
  gender: Gender;
  age: number;
};

export type ParseStudentImportResult = {
  students: StudentImportRow[];
  invalidRows: number[];
};

export const STUDENT_IMPORT_MAX = 500;
export const STUDENT_IMPORT_MIN_AGE = 0;
export const STUDENT_IMPORT_MAX_AGE = 120;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (
    nameIndex === -1 ||
    emailIndex === -1 ||
    genderIndex === -1 ||
    ageIndex === -1
  ) {
    throw new Error(
      'The first row must contain "Name", "Email", "Gender", and "Age" columns.',
    );
  }

  const students: StudentImportRow[] = [];
  const seenEmails = new Set<string>();
  const invalidRows: number[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const name = cellText(row?.[nameIndex]);
    const email = cellText(row?.[emailIndex]).toLowerCase();
    const gender = parseGender(row?.[genderIndex]);
    const age = parseAge(row?.[ageIndex]);

    if (!name && !email && !gender && age === null) {
      continue;
    }

    if (!name || !EMAIL_PATTERN.test(email) || !gender || age === null) {
      invalidRows.push(index + 2);
      continue;
    }

    if (!seenEmails.has(email)) {
      seenEmails.add(email);
      students.push({ name, email, gender, age });
    }
  }

  if (students.length === 0) {
    if (invalidRows.length > 0) {
      throw new Error(
        `No valid students found. Fix missing names, invalid emails, gender, or age in row${invalidRows.length === 1 ? "" : "s"} ${formatStudentImportRowList(invalidRows)}, then re-upload.`,
      );
    }
    throw new Error("No valid students were found in the spreadsheet.");
  }

  if (students.length > STUDENT_IMPORT_MAX) {
    throw new Error(`Import up to ${STUDENT_IMPORT_MAX} students at a time.`);
  }

  return { students, invalidRows };
}
