import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ImportLockService } from "./import-lock.service";

describe("ImportLockService", () => {
  it("blocks updates to a batch that is currently importing", async () => {
    const prisma = {
      studioDataImport: {
        findFirst: vi.fn().mockResolvedValue({
          payload: {
            batches: [{ name: "Kids Hip-Hop" }],
          },
        }),
      },
      batch: {
        findUnique: vi.fn().mockResolvedValue({ name: "Kids Hip-Hop" }),
      },
    };
    const service = new ImportLockService(prisma as never);

    await expect(
      service.assertBatchUnlocked("studio-1", "batch-1"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("allows updates when no import is active", async () => {
    const prisma = {
      studioDataImport: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      batch: {
        findUnique: vi.fn(),
      },
    };
    const service = new ImportLockService(prisma as never);

    await expect(
      service.assertBatchUnlocked("studio-1", "batch-1"),
    ).resolves.toBeUndefined();
    expect(prisma.batch.findUnique).not.toHaveBeenCalled();
  });
});
