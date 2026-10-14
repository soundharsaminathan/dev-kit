import type {
  ImportAttendanceDto,
  ImportBatchDto,
  ImportEnrollmentDto,
  ImportInvoiceDto,
  ImportLocationDto,
  ImportSessionDto,
  ImportStudioDataDto,
  ImportStudentDto,
} from "./dto/import-studio-data.dto";

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

export const IMPORT_PROGRESS_CHUNK_SIZE = 50;

function emptyEntityState(total = 0): ImportEntityState {
  return {
    status: "waiting",
    total,
    processed: 0,
    created: 0,
    skipped: 0,
    samples: [],
  };
}

export function buildInitialEntities(
  dto: ImportStudioDataDto,
): ImportEntitiesSnapshot {
  return {
    students: emptyEntityState(dto.students?.length ?? 0),
    locations: emptyEntityState(dto.locations?.length ?? 0),
    batches: emptyEntityState(dto.batches?.length ?? 0),
    sessions: emptyEntityState(dto.sessions?.length ?? 0),
    enrollments: emptyEntityState(dto.enrollments?.length ?? 0),
    invoices: emptyEntityState(dto.invoices?.length ?? 0),
    attendance: emptyEntityState(dto.attendance?.length ?? 0),
  };
}

export function entitySamples(
  entity: ImportEntityKey,
  dto: ImportStudioDataDto,
): string[] {
  switch (entity) {
    case "students":
      return sampleNames(dto.students ?? [], (row) => row.name);
    case "locations":
      return sampleNames(dto.locations ?? [], (row) => row.name);
    case "batches":
      return sampleNames(dto.batches ?? [], (row) => row.name);
    case "sessions":
      return sampleNames(
        dto.sessions ?? [],
        (row) => `${row.batchName} · ${row.date}`,
      );
    case "enrollments":
      return sampleNames(
        dto.enrollments ?? [],
        (row) => `${row.studentEmail} → ${row.batchName}`,
      );
    case "invoices":
      return sampleNames(
        dto.invoices ?? [],
        (row) => `${row.studentEmail} · ${row.status}`,
      );
    case "attendance":
      return sampleNames(
        dto.attendance ?? [],
        (row) => `${row.studentEmail} → ${row.batchName}`,
      );
  }
}

function sampleNames<T>(rows: T[], label: (row: T) => string, limit = 3): string[] {
  return rows.slice(0, limit).map(label);
}

export function dtoSliceCount(entity: ImportEntityKey, dto: ImportStudioDataDto): number {
  switch (entity) {
    case "students":
      return dto.students?.length ?? 0;
    case "locations":
      return dto.locations?.length ?? 0;
    case "batches":
      return dto.batches?.length ?? 0;
    case "sessions":
      return dto.sessions?.length ?? 0;
    case "enrollments":
      return dto.enrollments?.length ?? 0;
    case "invoices":
      return dto.invoices?.length ?? 0;
    case "attendance":
      return dto.attendance?.length ?? 0;
  }
}

export type ImportProgressPatch = Partial<
  Pick<
    ImportEntityState,
    "status" | "processed" | "created" | "skipped" | "samples"
  >
>;
