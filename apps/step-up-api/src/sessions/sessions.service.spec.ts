import { SessionStatus, SessionType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsService } from "./sessions.service";

describe("SessionsService listTrialSlots", () => {
  const prisma = {
    session: {
      findMany: vi.fn(),
    },
  };

  const scheduleConflicts = {
    assertNoConflicts: vi.fn().mockResolvedValue(undefined),
  };

  const trialSlotsCache = {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
  };

  let service: SessionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionsService(
      prisma as never,
      scheduleConflicts as never,
      trialSlotsCache as never,
    );
  });

  it("returns cached trial slots on hit", async () => {
    const cached = [
      {
        sessionId: "session-trial-w0",
        batchId: "batch-trial-1",
        batchName: "Open Beginner Class",
        styleBadge: "Hip-hop",
        startsAt: "2026-07-25T11:00:00.000Z",
        endsAt: "2026-07-25T12:00:00.000Z",
      },
    ];
    trialSlotsCache.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.listTrialSlots("studio-1");

    expect(result).toEqual(cached);
    expect(prisma.session.findMany).not.toHaveBeenCalled();
    expect(trialSlotsCache.set).not.toHaveBeenCalled();
  });

  it("loads SCHEDULED sessions from db on miss and caches them", async () => {
    trialSlotsCache.get.mockResolvedValue(null);
    prisma.session.findMany.mockResolvedValue([
      {
        id: "session-trial-w0",
        batchId: "batch-trial-1",
        startsAt: new Date("2026-07-25T11:00:00.000Z"),
        endsAt: new Date("2026-07-25T12:00:00.000Z"),
        type: SessionType.REGULAR,
        status: SessionStatus.SCHEDULED,
        batch: {
          id: "batch-trial-1",
          name: "Open Beginner Class",
          danceCategories: [{ name: "Hip-hop", description: "Open beginner" }],
        },
      },
    ]);

    const result = await service.listTrialSlots("studio-1");

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: SessionStatus.SCHEDULED,
          batch: { studioId: "studio-1", active: true },
        }),
      }),
    );
    expect(
      prisma.session.findMany.mock.calls[0]?.[0]?.where?.type,
    ).toBeUndefined();
    expect(result).toEqual([
      {
        sessionId: "session-trial-w0",
        batchId: "batch-trial-1",
        batchName: "Open Beginner Class",
        styleBadge: "Hip-hop",
        startsAt: "2026-07-25T11:00:00.000Z",
        endsAt: "2026-07-25T12:00:00.000Z",
      },
    ]);
    expect(trialSlotsCache.set).toHaveBeenCalledWith(
      "studio-1",
      JSON.stringify(result),
    );
  });
});
