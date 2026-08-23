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
  batchName: string | null;
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

export const IMPORT_ENTITY_DESCRIPTIONS: Record<ImportEntityKey, string> = {
  students: "Import student details and profiles",
  locations: "Import studio locations and rooms",
  batches: "Import class batches and schedules",
  sessions: "Import scheduled class sessions",
  enrollments: "Import student batch enrollments",
  invoices: "Import invoices and payment records",
  attendance: "Import session attendance records",
};

export const IMPORT_SEGMENT_COUNT = 40;

export function computeImportProgress(entities: ImportEntitiesSnapshot): {
  percent: number;
  completedCount: number;
  totalEntities: number;
} {
  const totalEntities = IMPORT_ENTITY_KEYS.length;
  let progressUnits = 0;
  let completedCount = 0;

  for (const key of IMPORT_ENTITY_KEYS) {
    const entity = entities[key];
    if (entity.status === "completed") {
      progressUnits += 1;
      completedCount += 1;
      continue;
    }
    if (entity.status === "creating") {
      const fraction =
        entity.total > 0 ? Math.min(1, entity.processed / entity.total) : 0;
      progressUnits += fraction;
      continue;
    }
    if (entity.status === "failed") {
      const fraction =
        entity.total > 0 ? Math.min(1, entity.processed / entity.total) : 0;
      progressUnits += fraction;
    }
  }

  return {
    percent: Math.round((progressUnits / totalEntities) * 100),
    completedCount,
    totalEntities,
  };
}

export function resolveEntityStatus(
  entity: ImportEntityState,
  jobDone: boolean,
): ImportEntityStatus {
  if (entity.status === "completed" || entity.status === "failed") {
    return entity.status;
  }
  if (jobDone && entity.total === 0) {
    return "completed";
  }
  return entity.status;
}

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
