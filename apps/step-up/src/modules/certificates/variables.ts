export type CertificateVariableKey =
  | "student_name"
  | "course_name"
  | "completion_date"
  | "certificate_id"
  | "instructor_name"
  | "dance_categories"
  | "trainers";

export type CertificateVariableDef = {
  key: CertificateVariableKey;
  label: string;
  description: string;
  sample: string;
};

export const CERTIFICATE_VARIABLES: CertificateVariableDef[] = [
  {
    key: "student_name",
    label: "Student name",
    description: "Recipient full name",
    sample: "Alex Student",
  },
  {
    key: "course_name",
    label: "Course / batch",
    description: "Batch or contest name",
    sample: "Summer Hip Hop Batch",
  },
  {
    key: "completion_date",
    label: "Completion date",
    description: "Date of issue or completion",
    sample: "July 21, 2026",
  },
  {
    key: "certificate_id",
    label: "Certificate number",
    description: "Human-readable certificate ID",
    sample: "SU-2026-00042",
  },
  {
    key: "instructor_name",
    label: "Instructor name",
    description: "Primary trainer or instructor",
    sample: "Jordan Lee",
  },
  {
    key: "dance_categories",
    label: "Dance categories",
    description: "Comma-separated dance styles",
    sample: "Hip Hop, Contemporary",
  },
  {
    key: "trainers",
    label: "Trainers",
    description: "Comma-separated trainer names",
    sample: "Jordan Lee, Sam Rivera",
  },
];

export type VariableBindings = Partial<Record<CertificateVariableKey, string>>;

export function sampleVariableBindings(
  overrides: VariableBindings = {},
): Record<CertificateVariableKey, string> {
  const base = Object.fromEntries(
    CERTIFICATE_VARIABLES.map((v) => [v.key, v.sample]),
  ) as Record<CertificateVariableKey, string>;
  return { ...base, ...overrides };
}

export function variableToken(key: CertificateVariableKey) {
  return `{{${key}}}`;
}

export function formatCertificateNumber(
  year: number,
  seq: number,
  studioKey = "SU",
): string {
  const prefix =
    studioKey
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase() || "SU";
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}

export function parseVariableToken(
  value: string,
): CertificateVariableKey | null {
  const match = /^\{\{(\w+)\}\}$/.exec(value.trim());
  if (!match) return null;
  const key = match[1] as CertificateVariableKey;
  return CERTIFICATE_VARIABLES.some((v) => v.key === key) ? key : null;
}
