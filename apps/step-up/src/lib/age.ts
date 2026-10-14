import type { AgeRange } from "./constants";

/** Whole years between a YYYY-MM-DD date of birth and today. Null for invalid or future dates. */
export function ageFromDateOfBirth(
  dateOfBirth: string | null | undefined,
  now = new Date(),
): number | null {
  if (!dateOfBirth) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
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

/** Maps an exact age to the stored age-range label. */
export function ageRangeFromAge(
  age: number | null | undefined,
): AgeRange | null {
  if (age === null || age === undefined) return null;
  if (age < 10) return "UNDER_10";
  if (age < 20) return "TEN_TO_TWENTY";
  if (age < 40) return "TWENTY_TO_FORTY";
  return "FORTY_PLUS";
}
