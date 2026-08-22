import type { IconName } from "@dev-ui/icons";

export const IMPORT_ENTITY_KEYS = [
  "students",
  "locations",
  "batches",
  "sessions",
  "enrollments",
  "invoices",
  "attendance",
] as const;

export type ImportEntityKey = (typeof IMPORT_ENTITY_KEYS)[number];

export type ImportEntityStatus =
  | "waiting"
  | "creating"
  | "completed"
  | "failed";

export type ImportEntityState = {
  status: ImportEntityStatus;
  total: number;
  processed: number;
  created: number;
  skipped: number;
  samples: string[];
};

export type ImportEntitiesSnapshot = Record<ImportEntityKey, ImportEntityState>;

export type StudioDataImportJobStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED";

export type ImportJobSnapshot = {
  id: string;
  status: StudioDataImportJobStatus;
  error: string | null;
  entities: ImportEntitiesSnapshot;
};

export const IMPORT_ENTITY_LABELS: Record<ImportEntityKey, string> = {
  students: "Students",
  locations: "Locations",
  batches: "Batches",
  sessions: "Sessions",
  enrollments: "Enrollments",
  invoices: "Invoices & payments",
  attendance: "Attendance",
};

export const IMPORT_ENTITY_ICONS: Record<ImportEntityKey, IconName> = {
  students: "users",
  locations: "map-pin",
  batches: "layout-grid",
  sessions: "clock",
  enrollments: "link",
  invoices: "credit-card",
  attendance: "check-circle",
};

export function activeImportEntities(
  entities: ImportEntitiesSnapshot,
): ImportEntityKey[] {
  return IMPORT_ENTITY_KEYS.filter((key) => entities[key].total > 0);
}

export function totalImportCreated(entities: ImportEntitiesSnapshot): number {
  return IMPORT_ENTITY_KEYS.reduce(
    (sum, key) => sum + entities[key].created,
    0,
  );
}

export function totalImportSkipped(entities: ImportEntitiesSnapshot): number {
  return IMPORT_ENTITY_KEYS.reduce(
    (sum, key) => sum + entities[key].skipped,
    0,
  );
}
