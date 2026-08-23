import { type Mock, vi } from "vitest";
import type { ImportStudioDataDto } from "../../data-import/dto/import-studio-data.dto";
import type { StudioDataImport } from "@prisma/client";

export type ImportLockMock = {
  assertBatchUnlocked: Mock<
    (studioId: string, batchId: string) => Promise<void>
  >;
  assertBatchNameUnlocked: Mock<
    (studioId: string, batchName: string) => Promise<void>
  >;
  getActiveImport: Mock<
    (studioId: string) => Promise<StudioDataImport | null>
  >;
  getActiveImportBatchName: Mock<
    (studioId: string) => Promise<string | null>
  >;
  resolveImportBatchName: Mock<
    (dto: ImportStudioDataDto) => string | null
  >;
};

export function createImportLockMock(): ImportLockMock {
  return {
    assertBatchUnlocked: vi.fn().mockResolvedValue(undefined),
    assertBatchNameUnlocked: vi.fn().mockResolvedValue(undefined),
    getActiveImport: vi.fn().mockResolvedValue(null),
    getActiveImportBatchName: vi.fn().mockResolvedValue(null),
    resolveImportBatchName: vi.fn(),
  };
}
