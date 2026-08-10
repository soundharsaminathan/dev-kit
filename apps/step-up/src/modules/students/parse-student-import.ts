import type { AgeRange, Gender } from "@/lib/constants";

export type StudentImportRow = {
  name: string;
  email: string;
  gender: Gender;
  ageRange: AgeRange;
};

export type ParseStudentImportResult = {
  students: StudentImportRow[];
  invalidRows: number[];
};

export const STUDENT_IMPORT_MAX = 500;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENDER_ALIASES: Record<string, Gender> = {
  female: "FEMALE",
  f: "FEMALE",
  male: "MALE",
  m: "MALE",
};

const AGE_RANGE_ALIASES: Record<string, AgeRange> = {
  under_10: "UNDER_10",
  under10: "UNDER_10",
  "under 10": "UNDER_10",
  toddlers: "UNDER_10",
  ten_to_twenty: "TEN_TO_TWENTY",
  tentotwenty: "TEN_TO_TWENTY",
  "10 20": "TEN_TO_TWENTY",
  "10 to 20": "TEN_TO_TWENTY",
  teens: "TEN_TO_TWENTY",
  twenty_to_forty: "TWENTY_TO_FORTY",
  twentytoforty: "TWENTY_TO_FORTY",
  "20 40": "TWENTY_TO_FORTY",
  "20 to 40": "TWENTY_TO_FORTY",
  adults: "TWENTY_TO_FORTY",
  forty_plus: "FORTY_PLUS",
  fortyplus: "FORTY_PLUS",
  "40+": "FORTY_PLUS",
  "40 plus": "FORTY_PLUS",
  masters: "FORTY_PLUS",
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

const AGE_RANGE_VALUES = new Set<AgeRange>([
  "UNDER_10",
  "TEN_TO_TWENTY",
  "TWENTY_TO_FORTY",
  "FORTY_PLUS",
]);

function parseAgeRange(value: unknown): AgeRange | null {
  const raw = cellText(value);
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/[\s-–—]+/g, "_");
  if (AGE_RANGE_VALUES.has(upper as AgeRange)) {
    return upper as AgeRange;
  }
  const compact = raw
    .toLowerCase()
    .replace(/[+]/g, " plus")
    .replace(/[\s-–—]+/g, " ")
    .trim();
  const underscored = compact.replace(/\s+/g, "_");
  return (
    AGE_RANGE_ALIASES[compact] ??
    AGE_RANGE_ALIASES[underscored] ??
    AGE_RANGE_ALIASES[compact.replace(/\s+/g, "")] ??
    null
  );
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
  const ageRangeIndex = findColumnIndex(headers, [
    "age range",
    "agerange",
    "age",
  ]);

  if (
    nameIndex === -1 ||
    emailIndex === -1 ||
    genderIndex === -1 ||
    ageRangeIndex === -1
  ) {
    throw new Error(
      'The first row must contain "Name", "Email", "Gender", and "Age Range" columns.',
    );
  }

  const students: StudentImportRow[] = [];
  const seenEmails = new Set<string>();
  const invalidRows: number[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const name = cellText(row?.[nameIndex]);
    const email = cellText(row?.[emailIndex]).toLowerCase();
    const gender = parseGender(row?.[genderIndex]);
    const ageRange = parseAgeRange(row?.[ageRangeIndex]);

    if (!name && !email && !gender && !ageRange) {
      continue;
    }

    if (!name || !EMAIL_PATTERN.test(email) || !gender || !ageRange) {
      invalidRows.push(index + 2);
      continue;
    }

    if (!seenEmails.has(email)) {
      seenEmails.add(email);
      students.push({ name, email, gender, ageRange });
    }
  }

  if (students.length === 0) {
    if (invalidRows.length > 0) {
      throw new Error(
        `No valid students found. Fix missing names, invalid emails, gender, or age range in row${invalidRows.length === 1 ? "" : "s"} ${formatStudentImportRowList(invalidRows)}, then re-upload.`,
      );
    }
    throw new Error("No valid students were found in the spreadsheet.");
  }

  if (students.length > STUDENT_IMPORT_MAX) {
    throw new Error(`Import up to ${STUDENT_IMPORT_MAX} students at a time.`);
  }

  return { students, invalidRows };
}
