import type { ImportStudioDataDto } from "./dto/import-studio-data.dto";

export function resolveImportBatchName(
  dto: ImportStudioDataDto,
): string | null {
  const batchRow = dto.batches?.[0];
  if (batchRow?.name?.trim()) {
    return batchRow.name.trim();
  }

  for (const row of dto.enrollments ?? []) {
    if (row.batchName?.trim()) {
      return row.batchName.trim();
    }
  }
  for (const row of dto.sessions ?? []) {
    if (row.batchName?.trim()) {
      return row.batchName.trim();
    }
  }
  for (const row of dto.attendance ?? []) {
    if (row.batchName?.trim()) {
      return row.batchName.trim();
    }
  }
  for (const row of dto.invoices ?? []) {
    if (row.batchName?.trim()) {
      return row.batchName.trim();
    }
  }

  return null;
}

export function importBatchNamesMatch(
  left: string,
  right: string,
): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}
