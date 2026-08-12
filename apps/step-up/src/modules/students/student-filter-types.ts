import type { AgeRange, Gender } from "@/lib/constants";

export type StudentFunnelStage =
  | "active"
  | "signedInOnly"
  | "trialAttended"
  | "leftBatch";

export type StudentFunnelPeriod =
  | "lifetime"
  | "this_month"
  | "last_quarter"
  | "this_year_half"
  | "this_year";

export type StudentAgeRange = AgeRange;
export type StudentGender = Gender;

export type DirectoryStudent = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
  role: string;
  createdAt: string;
  funnelStage: StudentFunnelStage;
  paidMonths?: number;
  gender?: StudentGender | null;
  ageRange?: StudentAgeRange | null;
  active?: boolean;
};

export type StudentFiltersDraft = {
  stage: string;
  period: StudentFunnelPeriod;
  ageRange: string;
  gender: string;
  search: string;
};

export const STAGE_OPTIONS = [
  { id: "ALL", label: "All stages" },
  { id: "active", label: "Active" },
  { id: "signedInOnly", label: "Signed in only" },
  { id: "trialAttended", label: "Trial attended" },
  { id: "leftBatch", label: "Left batch" },
] as const;

export const PERIOD_OPTIONS = [
  { id: "lifetime", label: "Lifetime" },
  { id: "this_month", label: "This month" },
  { id: "last_quarter", label: "Last quarter" },
  { id: "this_year_half", label: "This year half" },
  { id: "this_year", label: "This year" },
] as const;

export const AGE_RANGE_OPTIONS = [
  { id: "ALL", label: "All ages" },
  { id: "UNDER_10", label: "Under 10" },
  { id: "TEN_TO_TWENTY", label: "10–20" },
  { id: "TWENTY_TO_FORTY", label: "20–40" },
  { id: "FORTY_PLUS", label: "40+" },
] as const;

export const GENDER_OPTIONS = [
  { id: "ALL", label: "All genders" },
  { id: "FEMALE", label: "Female" },
  { id: "MALE", label: "Male" },
] as const;

export const STAGE_LABELS: Record<StudentFunnelStage, string> = {
  active: "Active",
  signedInOnly: "Signed in only",
  trialAttended: "Trial attended",
  leftBatch: "Left batch",
};

export const FUNNEL_STAGES = new Set<string>([
  "active",
  "signedInOnly",
  "trialAttended",
  "leftBatch",
]);

export const FUNNEL_PERIODS = new Set<string>([
  "lifetime",
  "this_month",
  "last_quarter",
  "this_year_half",
  "this_year",
]);

export const AGE_RANGES = new Set<string>([
  "UNDER_10",
  "TEN_TO_TWENTY",
  "TWENTY_TO_FORTY",
  "FORTY_PLUS",
]);

export const GENDERS = new Set<string>(["FEMALE", "MALE"]);

type DateRange = {
  start: Date | null;
  end: Date | null;
};

function resolvePeriodRange(
  period: StudentFunnelPeriod,
  now = new Date(),
): DateRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  switch (period) {
    case "lifetime":
      return { start: null, end: null };
    case "this_month":
      return {
        start: new Date(Date.UTC(year, month, 1)),
        end: now,
      };
    case "last_quarter": {
      const currentQuarter = Math.floor(month / 3);
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const lastQuarterYear = currentQuarter === 0 ? year - 1 : year;
      return {
        start: new Date(Date.UTC(lastQuarterYear, lastQuarter * 3, 1)),
        end: new Date(Date.UTC(lastQuarterYear, lastQuarter * 3 + 3, 1)),
      };
    }
    case "this_year_half": {
      const halfStartMonth = month < 6 ? 0 : 6;
      return {
        start: new Date(Date.UTC(year, halfStartMonth, 1)),
        end: now,
      };
    }
    case "this_year":
      return {
        start: new Date(Date.UTC(year, 0, 1)),
        end: now,
      };
  }
}

function isCreatedInPeriod(createdAt: string, period: StudentFunnelPeriod) {
  if (period === "lifetime") return true;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;
  const range = resolvePeriodRange(period);
  if (range.start && date < range.start) return false;
  if (range.end && date >= range.end) return false;
  return true;
}

export function matchesStudentSearch(
  student: DirectoryStudent,
  search: string,
) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [student.name, student.email, student.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function applyStudentFilters(
  items: DirectoryStudent[],
  draft: StudentFiltersDraft,
): DirectoryStudent[] {
  let next = items;
  if (draft.period !== "lifetime") {
    next = next.filter((student) =>
      isCreatedInPeriod(student.createdAt, draft.period),
    );
  }
  if (draft.stage !== "ALL") {
    next = next.filter((student) => student.funnelStage === draft.stage);
  }
  if (draft.ageRange !== "ALL") {
    next = next.filter((student) => student.ageRange === draft.ageRange);
  }
  if (draft.gender !== "ALL") {
    next = next.filter((student) => student.gender === draft.gender);
  }
  if (draft.search.trim()) {
    next = next.filter((student) =>
      matchesStudentSearch(student, draft.search),
    );
  }
  return next;
}
