import { describe, expect, it, vi } from "vitest";
import { RetentionService } from "./retention.service";

describe("RetentionService people fields", () => {
  it("includes email and phone on absentee and recent-student rows", async () => {
    const crypto = {
      decryptUser: vi.fn((user: { id: string }) => {
        if (user.id === "s1") {
          return {
            id: "s1",
            name: "Ada Lovelace",
            email: "ada@example.com",
            phone: "+91 98765 43210",
          };
        }
        return {
          id: "s2",
          name: "Grace Hopper",
          email: "grace@example.com",
          phone: "+91 90000 11111",
        };
      }),
    };

    const prisma = {
      batch: {
        findUnique: vi.fn().mockResolvedValue({
          studioId: "studio-1",
          capacity: 20,
        }),
      },
      batchSummary: {
        findUnique: vi.fn().mockResolvedValue({
          capacity: 20,
          enrolled: 1,
          reserved: 0,
          availableSeats: 19,
        }),
      },
      batchEnrollment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      attendance: {
        findMany: vi.fn().mockResolvedValue([
          {
            studentId: "s1",
            sessionId: "sess-1",
            student: { id: "s1" },
            session: { startsAt: new Date("2026-08-01T10:00:00.000Z") },
          },
        ]),
      },
      booking: {
        findMany: vi.fn().mockResolvedValue([
          {
            studentId: "s2",
            status: "COMPLETED",
            student: { id: "s2" },
          },
        ]),
      },
      invoice: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const service = new RetentionService(prisma as never, crypto as never);

    const batchStats = await service.getBatchStats("batch-1");
    expect(batchStats.absenteeList[0]).toMatchObject({
      studentId: "s1",
      studentName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+91 98765 43210",
    });

    const trainerStats = await service.getTrainerStats(
      "trainer-1",
      "studio-1",
    );
    expect(trainerStats.recentStudents[0]).toMatchObject({
      studentId: "s2",
      studentName: "Grace Hopper",
      email: "grace@example.com",
      phone: "+91 90000 11111",
    });
  });
});
