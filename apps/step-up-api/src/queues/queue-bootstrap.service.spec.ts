import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueueBootstrapService } from "./queue-bootstrap.service";

describe("QueueBootstrapService", () => {
  const hang = () => new Promise<never>(() => {});

  const scheduledQueue = { add: vi.fn(hang) };
  const retentionQueue = { add: vi.fn(hang) };
  const digestQueue = { add: vi.fn(hang) };

  let service: QueueBootstrapService;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduledQueue.add.mockImplementation(hang);
    retentionQueue.add.mockImplementation(hang);
    digestQueue.add.mockImplementation(hang);
    service = new QueueBootstrapService(
      scheduledQueue as never,
      retentionQueue as never,
      digestQueue as never,
    );
  });

  it("returns immediately when Redis queue.add never resolves", async () => {
    const blocked = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("onModuleInit blocked on Redis")), 50);
    });

    await expect(
      Promise.race([Promise.resolve(service.onModuleInit()), blocked]),
    ).resolves.toBeUndefined();
  });
});
