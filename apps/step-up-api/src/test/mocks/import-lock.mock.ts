import { vi } from "vitest";

export function createImportLockMock() {
  return {
    assertBatchUnlocked: vi.fn().mockResolvedValue(undefined),
    assertBatchNameUnlocked: vi.fn().mockResolvedValue(undefined),
    getActiveImport: vi.fn().mockResolvedValue(null),
    getActiveImportBatchName: vi.fn().mockResolvedValue(null),
    resolveImportBatchName: vi.fn(),
  };
}
