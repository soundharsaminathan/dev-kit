import { AgeRange } from "@prisma/client";

const MIN_IMPORT_AGE = 0;
const MAX_IMPORT_AGE = 120;

export function isImportAge(age: number): boolean {
  return (
    Number.isInteger(age) && age >= MIN_IMPORT_AGE && age <= MAX_IMPORT_AGE
  );
}

/** Maps an exact age to the stored age-range label. */
export function ageRangeFromAge(age: number): AgeRange {
  if (age < 10) return AgeRange.UNDER_10;
  if (age < 20) return AgeRange.TEN_TO_TWENTY;
  if (age < 40) return AgeRange.TWENTY_TO_FORTY;
  return AgeRange.FORTY_PLUS;
}

/** Whole years between a calendar date of birth and now. Returns null for invalid or future dates. */
export function ageFromDateOfBirth(
  dateOfBirth: Date | string | null | undefined,
  now = new Date(),
): number | null {
  if (dateOfBirth === null || dateOfBirth === undefined) return null;
  const dob =
    typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const birth = new Date(
    Date.UTC(dob.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()),
  );
  if (birth > today) return null;

  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() &&
      today.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
