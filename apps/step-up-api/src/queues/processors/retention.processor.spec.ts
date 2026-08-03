import { NotificationStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetentionProcessor } from "./retention.processor";

describe("RetentionProcessor", () => {
  const prisma = {
    notification: {
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    outboxEvent: {
      deleteMany: vi.fn(),
    },
  };

  let processor: RetentionProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.notification.updateMany.mockResolvedValue({ count: 2 });
    prisma.notification.deleteMany.mockResolvedValue({ count: 1 });
    prisma.outboxEvent.deleteMany.mockResolvedValue({ count: 3 });
    processor = new RetentionProcessor(prisma as never);
  });

  it("archives old notifications, hard-deletes stale ones, and clears outbox", async () => {
    await expect(processor.process({} as never)).resolves.toEqual({
      softDeleted: 2,
      hardDeleted: 1,
      outboxCleared: 3,
    });

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: NotificationStatus.ARCHIVED,
          deletedAt: null,
        }),
        data: expect.objectContaining({
          status: NotificationStatus.DELETED,
        }),
      }),
    );

    expect(prisma.notification.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: NotificationStatus.DELETED,
        }),
      }),
    );

    expect(prisma.outboxEvent.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          publishedAt: expect.objectContaining({ not: null }),
        }),
      }),
    );
  });
});
